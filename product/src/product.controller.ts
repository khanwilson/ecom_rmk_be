import { JwtAuthGuard } from '@ecom-rmk/libs/auth';
import { processPhoneNumber } from '@ecom-rmk/libs/utils';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KafkaService } from 'kafka/kafka.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';
@ApiTags('product')
@Controller()
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly kafkaService: KafkaService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  getHello(): string {
    return this.productService.getHello();
  }

  @Get('test/redis')
  @ApiOperation({ summary: 'Test Redis connection and operations' })
  async testRedis() {
    console.log('phone number', processPhoneNumber('0901234567', 'VN'));

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

  /**
   * Create Product with Saga Pattern
   * This endpoint demonstrates distributed transaction using Saga Pattern
   * Flow: Create Product → Verify Seller → Activate Product (or Rollback)
   */
  @Post('create-with-saga')
  @ApiOperation({
    summary: 'Create Product with Saga Pattern (Distributed Transaction)',
    description:
      'Creates a product and verifies seller identity across services. If verification fails, product creation is rolled back automatically.',
  })
  @ApiBody({ type: CreateProductDto })
  async createProductWithSaga(@Body() dto: CreateProductDto) {
    return this.kafkaService.createProductWithSaga({
      name: dto.name,
      description: dto.description,
      sku: dto.sku,
      price: dto.price,
      type: dto.type,
      stock: dto.stock,
      sellerId: dto.sellerId,
    });
  }

  /**
   * Get Saga Status
   * Check the status of a saga transaction by kafkaId
   */
  @Get('saga/:kafkaId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Get Saga status by kafkaId',
    description: 'Returns the current status and steps of a saga transaction',
  })
  async getSagaStatus(@Param('kafkaId') kafkaId: string) {
    const status = await this.kafkaService.getKafkaStatus(kafkaId);
    if (!status) {
      return {
        success: false,
        message: `Saga with kafkaId ${kafkaId} not found`,
      };
    }
    return {
      success: true,
      ...status,
    };
  }
}
