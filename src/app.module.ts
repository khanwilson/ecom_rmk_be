import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongoService } from './database/mongo.service';
import { KafkaModule } from './kafka/kafka.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    RedisModule, // Global Redis for distributed cache & rate limiting
    KafkaModule, // Event streaming between services
  ],
  controllers: [AppController],
  providers: [AppService, MongoService],
})
export class AppModule {}
