import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { OtpModule } from 'modules/otp/otp.module';
import { StatelessJwtStrategy } from '@ecom-rmk/libs/auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StringValue } from "ms";
import { RedisService } from '@ecom-rmk/libs/redis';

@Module({
  imports: [
    OtpModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<StringValue>('ACCESS_TOKEN_EXPIRES_IN', '24h'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RedisService, StatelessJwtStrategy],
  exports: [AuthService],
})
export class AuthModule { }

