import { ClientsModule, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'ecom-rmk-producer',
              brokers: [configService.get('KAFKA_BROKER', 'kafka:9092')],
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaClientModule {}


