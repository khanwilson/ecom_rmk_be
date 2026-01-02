import { handleError } from '@ecom-rmk/libs/common';
import { RedisService } from '@ecom-rmk/libs/redis';
import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { IdentityStatus } from 'generated/prisma/enums';
import { OtpService } from 'modules/otp/otp.service';
import { prisma } from 'prisma/prisma';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from '@ecom-rmk/libs/auth';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresIn: string;
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly otpService: OtpService,
  ) {
    // Parse saltRounds to ensure it's a number (env variables are strings by default)
    const saltRoundsEnv = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12');
    this.saltRounds = parseInt(saltRoundsEnv, 10) || 12;
    const accessTokenExpiresIn = this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN', '86400');
    this.accessTokenExpiresIn = parseInt(accessTokenExpiresIn, 10) || 86400;
    this.refreshTokenExpiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
    this.jwtAccessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.jwtRefreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async register(dto: RegisterDto) {
    const { email, phone, password } = dto;

    // Check if identity already exists (by email or phone)
    const existing = await prisma.identity.findFirst({
      where: {
        OR: [
          { email },
          { phone },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Identity with this email or phone already exists');
    }

    // Hash password before transaction
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Generate OTP code and hash before transaction
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, this.saltRounds);
    const ttlSeconds = this.otpService['ttlSeconds'] || 300;
    const expiredAt = new Date(Date.now() + ttlSeconds * 1000);

    // ATOMIC TRANSACTION: Create Identity + OTP together
    // If any operation fails, entire transaction is rolled back (All or Nothing)
    let result;
    try {
      result = await prisma.$transaction(
        async (tx) => {
          // Step 1: Create Identity
          const identity = await tx.identity.create({
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

          // Step 2: Create OTP (within same transaction)
          // If this fails, Identity creation above will be rolled back automatically
          const otpRecord = await tx.otp.create({
            data: {
              identityId: identity.id,
              code: otpHash,
              type: 'EMAIL_VERIFY',
              expiredAt,
              sentCount: 1,
            },
          });

          // Both operations succeed or both fail (atomicity guaranteed by Replica Set)
          return { identity, otpRecord, otpCode };
        },
        {
          maxWait: 5000, // Maximum time to wait for transaction to start
          timeout: 10000, // Maximum time for transaction to complete
        },
      );
    } catch (error: any) {
      // Use centralized Prisma error handler for consistent error responses
      // This ensures all Prisma errors are handled uniformly across the application
      throw handleError(
        error,
        'An unexpected error occurred during registration',
      );
    }

    // After transaction commits successfully, handle Redis operations
    // These are outside the transaction but only execute if transaction succeeded
    try {
      // Store plain OTP code in Redis for quick verification
      const redisKey = `otp:${result.otpRecord.id}`;
      await this.redisService.set(redisKey, result.otpCode, ttlSeconds);

      // Increment sent count in Redis
      await this.redisService.incr(`otp:sent:${result.identity.id}:EMAIL_VERIFY`);

      // TODO: Send email with OTP code
      // await this.mailerService.sendOtpEmail(email, result.otpCode, 'EMAIL_VERIFY');
    } catch (error) {
      // Redis failure doesn't rollback transaction, but we log it
      console.error('Failed to store OTP in Redis:', error);
    }

    // Generate tokens
    const tokens = await this.generateTokens(result.identity.id, email, phone);

    return {
      ...tokens,
      identity: result.identity,
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
    // Note: email and phone are required in schema, so non-null assertion is safe
    const tokens = await this.generateTokens(identity.id, identity.email!, identity.phone!);

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
      // Note: email and phone are required in schema, so non-null assertion is safe
      const tokens = await this.generateTokens(identity.id, identity.email!, identity.phone!);

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
    // Note: email is required in schema, so non-null assertion is safe
    await this.otpService.sendOtp(identity.id, 'RESET_PWD' as any, identity.email!);

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

  private async generateTokens(identityId: string, email: string, phone: string) {
    // Generate new tokens (always generate fresh tokens)
    const payload: JwtPayload = {
      sub: identityId,
      email: email,
      phone: phone,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        secret: this.jwtAccessSecret,
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload as any, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.refreshTokenExpiresIn as any,
      }),
    ]);

    const cacheKey = `jwt.identity:${identityId}`;
    await this.redisService.set(cacheKey, payload, this.accessTokenExpiresIn);

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

