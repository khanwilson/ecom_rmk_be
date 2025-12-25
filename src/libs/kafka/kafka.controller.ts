import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Ip,
  OnModuleInit,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientKafka } from '@nestjs/microservices';
import { RedisService } from 'libs/redis';

@ApiTags('kafka')
@Controller('kafka')
export class KafkaController implements OnModuleInit {
  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
    console.log('✅ Kafka Producer connected');
  }

  @Post('send')
  @ApiOperation({ summary: 'Send an event to Kafka topic with rate limiting' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', example: 'order.created' },
        message: {
          type: 'object',
          example: { orderId: '123', userId: '456', total: 99.99 },
        },
      },
    },
  })
  async sendEvent(@Body() body: { topic: string; message: any }, @Ip() ip: string) {
    const { topic, message } = body;

    const rateLimitKey = `rate:kafka:send:${ip}`;
    const rateLimit = await this.redisService.checkRateLimit(rateLimitKey, 5, 60);

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too many Kafka events sent',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.kafkaClient.emit(topic, message);

    console.log(`📤 [Kafka Producer] Event emitted to topic: ${topic}`);
    console.log(`   Rate limit remaining: ${rateLimit.remaining}`);

    return {
      success: true,
      message: `Event sent to topic: ${topic}`,
      timestamp: new Date().toISOString(),
      rateLimit: {
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Kafka connection health' })
  healthCheck() {
    return {
      status: 'ok',
      kafka: 'connected (NestJS Microservices)',
      mode: 'KRaft (no Zookeeper)',
      timestamp: new Date().toISOString(),
    };
  }
}


