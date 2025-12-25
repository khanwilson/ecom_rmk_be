import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from 'libs/kafka';
import { RedisModule } from 'libs/redis';
import { MailerModule } from 'libs/mailer';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OtpModule } from './modules/otp/otp.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
      expandVariables: true,
    }),
    PrismaModule,
    RedisModule,
    KafkaModule,
    MailerModule,
    AuthModule,
    OtpModule,
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityAppModule {}


