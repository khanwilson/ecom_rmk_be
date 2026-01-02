import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { RedisService } from '@ecom-rmk/libs/redis';
import { handleError } from '@ecom-rmk/libs/common';
import { OtpType } from 'generated/prisma/enums';
import { prisma } from 'prisma/prisma';
@Injectable()
export class OtpService {
  private readonly ttlSeconds: number;
  private readonly maxPerWindow: number;
  private readonly windowSeconds: number;
  private readonly saltRounds: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.get<number>('OTP_TTL_SECONDS', 300);
    this.maxPerWindow = this.configService.get<number>('OTP_MAX_PER_WINDOW', 5);
    this.windowSeconds = this.configService.get<number>('OTP_WINDOW_SECONDS', 3600);
    // Parse saltRounds to ensure it's a number (env variables are strings by default)
    const saltRoundsEnv = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12');
    this.saltRounds = typeof saltRoundsEnv === 'number' ? saltRoundsEnv : parseInt(saltRoundsEnv, 10) || 12;
  }

  /**
   * Generate 6-digit OTP code
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to email
   */
  async sendOtp(identityId: string, type: OtpType, email: string): Promise<void> {
    // Rate limit check
    const rateLimitKey = `otp:rate:${identityId}:${type}`;
    const rateLimit = await this.redisService.checkRateLimit(
      rateLimitKey,
      this.maxPerWindow,
      this.windowSeconds,
    );

    if (!rateLimit.allowed) {
      throw new BadRequestException(
        `Too many OTP requests. Please try again after ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds`,
      );
    }

    // Generate OTP
    const otpCode = this.generateOtpCode();
    const otpHash = await bcrypt.hash(otpCode, this.saltRounds);

    // Calculate expiration
    const expiredAt = new Date(Date.now() + this.ttlSeconds * 1000);

    // Store in database
    let otpRecord;
    try {
      otpRecord = await prisma.otp.create({
        data: {
          identityId,
          code: otpHash,
          type,
          expiredAt,
          sentCount: 1,
        },
      });
    } catch (error) {
      throw handleError(error, 'Failed to create OTP record');
    }

    // Store in Redis for quick verification (TTL)
    const redisKey = `otp:${otpRecord.id}`;
    await this.redisService.set(redisKey, otpCode, this.ttlSeconds);

    // Send email
    // await this.mailerService.sendOtpEmail(email, otpCode, type);

    // Increment sent count in Redis
    await this.redisService.incr(`otp:sent:${identityId}:${type}`);
  }

  /**
   * Verify OTP
   */
  async verifyOtp(otpCode: string, type: OtpType): Promise<{ identityId: string } | null> {
    // Try to find in Redis first (faster)
    const keys = await this.redisService.keys(`otp:*`);
    for (const key of keys) {
      const storedCode = await this.redisService.get<string>(key);
      if (storedCode === otpCode) {
        // Extract OTP ID from key
        const otpId = key.split(':')[1];
        const otpRecord = await prisma.otp.findUnique({
          where: { id: otpId },
        });

        if (otpRecord && otpRecord.type === type && !otpRecord.consumedAt) {
          // Verify hash
          const isValid = await bcrypt.compare(otpCode, otpRecord.code);
          if (isValid && otpRecord.expiredAt > new Date()) {
            // Mark as consumed
            await prisma.otp.update({
              where: { id: otpId },
              data: { consumedAt: new Date() },
            });

            // Delete from Redis
            await this.redisService.del(key);

            return { identityId: otpRecord.identityId };
          }
        }
      }
    }

    // Fallback: search in database
    const otpRecords = await prisma.otp.findMany({
      where: {
        type,
        consumedAt: null,
        expiredAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Check last 10 OTPs
    });

    for (const record of otpRecords) {
      const isValid = await bcrypt.compare(otpCode, record.code);
      if (isValid) {
        await prisma.otp.update({
          where: { id: record.id },
          data: { consumedAt: new Date() },
        });

        return { identityId: record.identityId };
      }
    }

    return null;
  }
}

