import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { RedisService } from '@ecom-rmk/libs/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaController } from 'kafka/kafka.controller';
import { KafkaService } from 'kafka/kafka.service';
import { AuthModule } from 'modules/auth/auth.module';
import { OtpModule } from 'modules/otp/otp.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICES.IDENTITY_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'identity-service',
              brokers: [configService.get<string>('KAFKA_BROKER', 'kafka:9092')],
            },
            consumer: {
              groupId: 'identity-service-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    AuthModule,
    OtpModule,
  ],
  controllers: [IdentityController, KafkaController],
  providers: [IdentityService, KafkaService, RedisService],
  exports: [IdentityService],
})
export class IdentityModule {}
