import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { RedisService } from '@ecom-rmk/libs/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaController } from 'kafka/kafka.controller';
import { KafkaService } from 'kafka/kafka.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICES.USER_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'user-service',
              brokers: [configService.get<string>('KAFKA_BROKER', 'kafka:9092')],
            },
            consumer: {
              groupId: 'user-service-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [UserController, KafkaController],
  providers: [UserService, KafkaService, RedisService],
  exports: [UserService],
})
export class UserModule {}
