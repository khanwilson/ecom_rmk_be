import { StatelessJwtStrategy } from '@ecom-rmk/libs/auth';
import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { RedisService } from '@ecom-rmk/libs/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { OtpModule } from 'modules/otp/otp.module';
import { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICES.IDENTITY_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'identity-auth-producer',
              brokers: [configService.get<string>('KAFKA_BROKER', 'kafka:9092')],
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, RedisService, StatelessJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
