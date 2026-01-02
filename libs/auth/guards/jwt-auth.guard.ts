import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * Shared guard for all microservices
 * Uses Passport JWT strategy to verify tokens
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

