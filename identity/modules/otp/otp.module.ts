import { Module } from '@nestjs/common';
import { RedisService } from '@ecom-rmk/libs/redis';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';

@Module({
  controllers: [OtpController],
  providers: [OtpService, RedisService],
  exports: [OtpService],
})
export class OtpModule { }

