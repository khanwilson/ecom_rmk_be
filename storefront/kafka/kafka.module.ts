import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { StorefrontModule } from 'src/storefront.module';
import { KafkaController } from './kafka.controller';
import { KafkaService } from './kafka.service';

@Module({
  imports: [
    forwardRef(() => StorefrontModule),
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICES.STOREFRONT_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'storefront-service-kafka',
              brokers: [configService.get<string>('KAFKA_BROKER', 'kafka:9092')],
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
