import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ShopModule } from 'src/shop.module';
import { KafkaController } from './kafka.controller';
import { KafkaService } from './kafka.service';

@Module({
  imports: [
    forwardRef(() => ShopModule),
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICES.SHOP_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'shop-service-kafka',
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
