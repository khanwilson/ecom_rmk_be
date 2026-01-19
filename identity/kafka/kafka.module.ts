import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { IdentityModule } from 'src/identity.module';
import { KafkaController } from './kafka.controller';
import { KafkaService } from './kafka.service';

@Module({
  imports: [
    forwardRef(() => IdentityModule),
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
  ],
  controllers: [KafkaController],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
