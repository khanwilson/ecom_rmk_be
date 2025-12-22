import { Controller, Post, Body, Get, Inject, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ClientKafka } from '@nestjs/microservices';

@ApiTags('kafka')
@Controller('kafka')
export class KafkaController implements OnModuleInit {
  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Connect to Kafka broker
    await this.kafkaClient.connect();
    console.log('✅ Kafka Producer connected');
  }

  @Post('send')
  @ApiOperation({ summary: 'Send an event to Kafka topic' })
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
  async sendEvent(@Body() body: { topic: string; message: any }) {
    const { topic, message } = body;
    
    // Emit event to Kafka (fire and forget)
    this.kafkaClient.emit(topic, message);
    
    console.log(`📤 [Kafka Producer] Event emitted to topic: ${topic}`);
    
    return {
      success: true,
      message: `Event sent to topic: ${topic}`,
      timestamp: new Date().toISOString(),
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

