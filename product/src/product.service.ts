import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '@ecom-rmk/libs/redis';
import { ProductStatus } from 'generated/prisma/enums';
import { prisma } from 'prisma/prisma';
import { KAFKA_SERVICES, KAFKA_TOPICS } from 'utils/kafka.enum';
import { retryConnectKafkaService } from '@ecom-rmk/libs/utils';

@Injectable()
export class ProductService implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    @Inject(KAFKA_SERVICES.IDENTITY_SERVICE) private readonly identityClient: ClientKafka,
  ) { }

  async onModuleInit() {
    await retryConnectKafkaService(this.subscribeKafkaTopics.bind(this));
  }

  async subscribeKafkaTopics(): Promise<void> {
    this.identityClient.subscribeToResponseOf(KAFKA_TOPICS.IDENTITY_MESSAGE);
    await this.identityClient.connect();
  }

  getHello(): string {
    return 'Hello World!';
  }

  async testRedis(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const testKey = 'test:redis:connection';
      const testValue = { timestamp: Date.now(), message: 'Redis test successful' };

      // Test get
      const retrieved = await this.redisService.get(testKey);

      if (!retrieved) await this.redisService.set(testKey, testValue, 60); // TTL 60 seconds

      // Test exists
      const exists = await this.redisService.exists(testKey);

      return {
        success: true,
        message: 'Redis connection and operations successful',
        data: {
          set: 'OK',
          retrieved,
          exists,
          ttl: await this.redisService.ttl(testKey),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Redis test failed: ${error.message}`,
      };
    }
  }

  async testMongoDB(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Test MongoDB connection by creating a test record
      const testData = {
        name: `Test Product ${Date.now()}`,
        description: 'Test product description',
        sku: `TEST-SKU-${Date.now()}`,
        price: 99.99,
        status: ProductStatus.DRAFT,
      };

      // Try to create a test product
      const result = await prisma.product.create({
        data: testData,
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        message: 'MongoDB connection and insert successful',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `MongoDB test failed: ${error.message}`,
      };
    }
  }

  async emitToIdentity(message: string, data?: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const payload = {
        message,
        data: data || { timestamp: Date.now(), from: KAFKA_SERVICES.PRODUCT_SERVICE },
        timestamp: new Date().toISOString(),
      };

      const result = await firstValueFrom(this.identityClient.send(KAFKA_TOPICS.IDENTITY_MESSAGE, payload));

      return {
        success: true,
        message: 'Message sent to Identity service successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send message to Identity service: ${error.message}`,
      };
    }
  }
}

