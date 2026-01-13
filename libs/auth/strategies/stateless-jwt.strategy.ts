import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';
import { IdentityStatus, type JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Stateless JWT Strategy with optional Redis cache support
 *
 * Flow:
 * 1. Verify JWT signature with JWT_ACCESS_SECRET
 * 2. If RedisService is available:
 *    - Check token blacklist (key: `jwt.blacklist:${payload.sub}`)
 *    - Try to get identity info from Redis cache (key: `jwt.identity:${payload.sub}`)
 *    - If found in cache, return JwtPayload from cache
 *    - If not found, convert JWT payload to JwtPayload format (with default values)
 * 3. If RedisService is not available:
 *    - Convert JWT payload to JwtPayload format (with default values)
 *
 * Always returns JwtPayload (never JwtPayload) for consistent type across all services.
 *
 * Note: Identity service should cache identity info in Redis when:
 * - User logs in
 * - User status changes
 * - User verifies email
 * Cache key: `jwt.identity:${identityId}`
 * Cache TTL: Should match or be longer than JWT expiration
 */
@Injectable()
export class StatelessJwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Optional() private readonly redisService?: RedisService) {
    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
    this.redisService = redisService;
  }

  /**
   * Validate JWT payload
   * Tries to get identity from Redis cache
   * @param payload - Decoded JWT payload
   * @returns JwtPayload - Will be assigned to request.user
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Optional: Check Redis blacklist for token revocation
    if (!this.redisService) {
      throw new UnauthorizedException('Service is not available, please try again later');
    }
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid payload');
    }

    const isBlacklisted = await this.checkTokenBlacklist(payload.sub);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Try to get identity info from Redis cache
    const JwtPayload = await this.getIdentityFromCache(payload.sub);
    if (JwtPayload) {
      if (JwtPayload.status === IdentityStatus.AVAILABLE) {
        return JwtPayload;
      } else {
        throw new UnauthorizedException('Account is not available');
      }
    } else {
      throw new UnauthorizedException('Account not found');
    }
  }

  /**
   * Get identity info from Redis cache
   * @param identityId - Identity ID from JWT payload.sub
   * @returns JwtPayload if found in cache, undefined otherwise
   */
  private async getIdentityFromCache(identityId: string): Promise<JwtPayload | undefined> {
    if (!this.redisService) {
      throw new UnauthorizedException('Service is not available, please try again later');
    }
    try {
      const cacheKey = `jwt.identity:${identityId}`;
      const JwtPayload = await this.redisService.get<JwtPayload>(cacheKey);

      if (JwtPayload) {
        return JwtPayload;
      } else {
        return undefined;
      }
    } catch (error) {
      // If Redis error, log but don't fail authentication (fallback to stateless)
      console.warn('⚠️ Redis cache check failed, falling back to stateless JWT:', error?.message);
      return undefined;
    }
  }

  /**
   * Check if token/identity is blacklisted in Redis
   * @param identityId - Identity ID from JWT payload.sub
   * @returns true if blacklisted, false otherwise
   */
  private async checkTokenBlacklist(identityId: string): Promise<boolean> {
    if (!this.redisService) {
      throw new UnauthorizedException('Service is not available, please try again later');
    }
    try {
      const blacklistKey = `jwt.blacklist:${identityId}`;
      return await this.redisService.exists(blacklistKey);
    } catch (error) {
      // If Redis error, don't block authentication (fail open)
      console.warn('⚠️ Redis blacklist check failed:', error?.message);
      return false;
    }
  }
}
