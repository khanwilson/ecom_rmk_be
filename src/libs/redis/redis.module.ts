import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisController } from './redis.controller';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [RedisController],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}


