import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { IdentityService } from './identity.service';

@ApiTags('identity')
@Controller()
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  getHello(): string {
    return this.identityService.getHello();
  }

  @Get('test/redis')
  @ApiOperation({ summary: 'Test Redis connection and operations' })
  async testRedis() {
    return this.identityService.testRedis();
  }

  @Get('test/mongodb')
  @ApiOperation({ summary: 'Test MongoDB connection and insert operation' })
  async testMongoDB() {
    return this.identityService.testMongoDB();
  }

  @Post('test/kafka/emit')
  @ApiOperation({ summary: 'Test emit message to Product service via Kafka' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Hello from Identity service' },
        data: { type: 'object', example: { userId: '123', action: 'test' } },
      },
    },
  })
  async testKafkaEmit(@Body() body: { message?: string; data?: any }) {
    return this.identityService.emitToProduct(body.message || 'Test message', body.data);
  }
}
