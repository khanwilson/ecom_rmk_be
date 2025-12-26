import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { IdentityStatus } from 'generated/prisma/enums';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { prisma } from 'prisma/prisma';

export interface JwtPayload {
  sub: string; // identity id
  email?: string;
  phone?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const identity = await prisma.identity.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        emailVerified: true,
      },
    });

      if (!identity || identity.status !== IdentityStatus.AVAILABLE) {
        throw new UnauthorizedException('Identity not found or inactive');
      }

    return identity;
  }
}

