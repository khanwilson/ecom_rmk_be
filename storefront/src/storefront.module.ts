import { StatelessJwtStrategy } from '@ecom-rmk/libs/auth';
import { KAFKA_SERVICES } from '@ecom-rmk/libs/kafka';
import { RedisService } from '@ecom-rmk/libs/redis';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { KafkaModule } from 'kafka/kafka.module';
import { StringValue } from 'ms';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

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
        name: KAFKA_SERVICES.STOREFRONT_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'storefront-service',
              brokers: [configService.get<string>('KAFKA_BROKER', 'kafka:9092')],
            },
            consumer: {
              groupId: 'storefront-service-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    forwardRef(() => KafkaModule),
  ],
  controllers: [StorefrontController],
  providers: [StorefrontService, RedisService, StatelessJwtStrategy],
  exports: [StorefrontService],
})
export class StorefrontModule {}
