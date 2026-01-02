import { StatelessJwtStrategy } from '@ecom-rmk/libs/auth';
import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { RedisService } from '@ecom-rmk/libs/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { KafkaController } from 'kafka/kafka.controller';
import { KafkaService } from 'kafka/kafka.service';
import { StringValue } from 'ms';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
        name: KAFKA_SERVICES.PRODUCT_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'product-service',
              brokers: [
                configService.get<string>('KAFKA_BROKER', 'kafka:9092'),
              ],
            },
            consumer: {
              groupId: 'product-service-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ProductController, KafkaController],
  providers: [ProductService, KafkaService, RedisService, StatelessJwtStrategy],
  exports: [ProductService],
})
export class ProductModule { }

