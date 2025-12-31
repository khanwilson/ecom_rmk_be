import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule } from '@ecom-rmk/libs/redis';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { AuthModule } from 'modules/auth/auth.module';
import { OtpModule } from 'modules/otp/otp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    AuthModule,
    OtpModule,
    ClientsModule.registerAsync([
      {
        name: 'PRODUCT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'identity-service',
              brokers: [
                configService.get<string>('KAFKA_BROKER', 'kafka:9092'),
              ],
            },
            consumer: {
              groupId: 'identity-service-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule { }

