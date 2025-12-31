import { Controller, Get, Post, Body } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { KAFKA_TOPICS } from 'utils/kafka.enum';

@ApiTags('product')
@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  getHello(): string {
    return this.productService.getHello();
  }

  @Get('test/redis')
  @ApiOperation({ summary: 'Test Redis connection and operations' })
  async testRedis() {
    return this.productService.testRedis();
  }

  @Get('test/mongodb')
  @ApiOperation({ summary: 'Test MongoDB connection and insert operation' })
  async testMongoDB() {
    return this.productService.testMongoDB();
  }

  @Post('test/kafka/emit')
  @ApiOperation({ summary: 'Test emit message to Identity service via Kafka' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Hello from Product service' },
        data: { type: 'object', example: { productId: '456', action: 'test' } },
      },
    },
  })
  async testKafkaEmit(@Body() body: { message?: string; data?: any }) {
    return this.productService.emitToIdentity(body.message || 'Test message', body.data);
  }

  @MessagePattern(KAFKA_TOPICS.IDENTITY_MESSAGE)
  async handleIdentityMessage(@Payload() payload: any) {
    console.log('📨 Product service received message from Identity:', payload);
    return {
      success: true,
      message: 'Message received by Product service',
      receivedAt: new Date().toISOString(),
      payload,
    };
  }
}

