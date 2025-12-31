import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from '@ecom-rmk/libs/redis';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { OtpService } from 'modules/otp/otp.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { prisma } from 'prisma/prisma';
import { IdentityStatus } from 'generated/prisma/enums';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly otpService: OtpService,
  ) {
    this.saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    this.accessTokenExpiresIn = this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN', '24h');
    this.refreshTokenExpiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
    this.jwtAccessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.jwtRefreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async register(dto: RegisterDto) {
    const { email, phone, password } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    // Check if identity already exists
    const existing = await prisma.identity.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Identity with this email or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Create identity
    const identity = await prisma.identity.create({
      data: {
        email,
        phone,
        passwordHash,
        status: IdentityStatus.PENDING, // Will be AVAILABLE after email verification
      },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Send verification OTP if email provided
    if (email) {
      await this.otpService.sendOtp(identity.id, 'EMAIL_VERIFY' as any, email);
    }

    // Generate tokens
    const tokens = await this.generateTokens(identity.id, email, phone);

    return {
      ...tokens,
      identity,
    };
  }

  async login(dto: LoginDto) {
    const { emailOrPhone, password } = dto;

    // Find identity by email or phone
    const identity = await prisma.identity.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone },
        ],
      },
    });

    if (!identity) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked/banned/deleted
    const restrictedStatuses: IdentityStatus[] = [IdentityStatus.LOCKED, IdentityStatus.BANNED, IdentityStatus.DELETED];
    if (restrictedStatuses.includes(identity.status)) {
      throw new UnauthorizedException(`Account is ${identity.status.toLowerCase()}`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, identity.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login count
      await this.handleFailedLogin(identity.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login count on success
    await prisma.identity.update({
      where: { id: identity.id },
      data: {
        failedLoginCount: 0,
        lastLogin: new Date(),
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(identity.id, identity.email || undefined, identity.phone || undefined);

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.saltRounds);
    await prisma.identity.update({
      where: { id: identity.id },
      data: { refreshTokenHash },
    });

    return {
      ...tokens,
      identity: {
        id: identity.id,
        email: identity.email,
        phone: identity.phone,
        status: identity.status,
        emailVerified: identity.emailVerified,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      const identity = await prisma.identity.findUnique({
        where: { id: payload.sub },
      });

      if (!identity || !identity.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token hash
      const isValid = await bcrypt.compare(refreshToken, identity.refreshTokenHash);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(identity.id, identity.email || undefined, identity.phone || undefined);

      // Update refresh token hash
      const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.saltRounds);
      await prisma.identity.update({
        where: { id: identity.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(identityId: string) {
    // Revoke refresh token by clearing hash
    await prisma.identity.update({
      where: { id: identityId },
      data: { refreshTokenHash: null },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { emailOrPhone } = dto;

    const identity = await prisma.identity.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone },
        ],
      },
    });

    if (!identity) {
      // Don't reveal if identity exists for security
      return { message: 'If the identity exists, a reset code has been sent' };
    }

    // Send reset password OTP
    const email = identity.email || emailOrPhone;
    await this.otpService.sendOtp(identity.id, 'RESET_PWD' as any, email);

    return { message: 'If the identity exists, a reset code has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { otp, newPassword } = dto;

    // Verify OTP
    const otpRecord = await this.otpService.verifyOtp(otp, 'RESET_PWD' as any);
    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    await prisma.identity.update({
      where: { id: otpRecord.identityId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await prisma.identity.update({
      where: { id: otpRecord.identityId },
      data: { refreshTokenHash: null },
    });

    return { message: 'Password reset successfully' };
  }

  async deleteAccount(identityId: string) {
    // Soft delete
    await prisma.identity.update({
      where: { id: identityId },
      data: {
        status: IdentityStatus.DELETED,
        deletedAt: new Date(),
        refreshTokenHash: null, // Revoke tokens
      },
    });

    return { message: 'Account deleted successfully' };
  }

  private async generateTokens(identityId: string, email?: string, phone?: string) {
    const payload: JwtPayload = {
      sub: identityId,
      email,
      phone,
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        secret: this.jwtAccessSecret,
        expiresIn: this.accessTokenExpiresIn as any,
      }),
      this.jwtService.signAsync(payload as any, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.refreshTokenExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async handleFailedLogin(identityId: string) {
    const identity = await prisma.identity.findUnique({
      where: { id: identityId },
    });

    if (!identity) return;

    const failedCount = identity.failedLoginCount + 1;
    const maxAttempts = 5; // Lock after 5 failed attempts

    await prisma.identity.update({
      where: { id: identityId },
      data: {
        failedLoginCount: failedCount,
        lastFailedLoginAt: new Date(),
        ...(failedCount >= maxAttempts ? { status: IdentityStatus.LOCKED } : {}),
      },
    });

    // Set lock TTL in Redis (30 minutes)
    if (failedCount >= maxAttempts) {
      await this.redisService.set(`identity:lock:${identityId}`, '1', 1800);
    }
  }
}

