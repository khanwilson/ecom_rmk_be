import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '@ecom-rmk/libs/redis';
import { IdentityStatus } from 'generated/prisma/enums';
import { prisma } from 'prisma/prisma';
import { KAFKA_SERVICES, KAFKA_TOPICS } from '@ecom-rmk/libs/kafka';
import { retryConnect } from '@ecom-rmk/libs/utils';

@Injectable()
export class IdentityService implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    @Inject(KAFKA_SERVICES.IDENTITY_SERVICE) private readonly identityClient: ClientKafka,
  ) { }

  async onModuleInit() {
    await retryConnect('IdentityService Kafka', this.subscribeKafkaTopics.bind(this));
  }

  async subscribeKafkaTopics(): Promise<void> {
    this.identityClient.subscribeToResponseOf(KAFKA_TOPICS.HELLO);
    await this.identityClient.connect();
  }

  getHello(): string {
    return 'Hello World!!!!';
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
        email: `test-${Date.now()}@example.com`,
        phone: '09123456789',
        passwordHash: 'test-password-hash-' + Date.now(),
        status: IdentityStatus.PENDING, // Using PENDING as default status
      };

      // Try to create a test identity
      const result = await prisma.identity.create({
        data: testData,
        select: {
          id: true,
          email: true,
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

  async emitToProduct(message: string, data?: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const payload = {
        message,
        data: data || { timestamp: Date.now(), from: 'IDENTITY_SERVICE' },
        timestamp: new Date().toISOString(),
      };

      const result = await firstValueFrom(this.identityClient.send(KAFKA_TOPICS.HELLO, payload));

      return {
        success: true,
        message: 'Message sent to Product service successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send message to Product service: ${error.message}`,
      };
    }
  }
}

