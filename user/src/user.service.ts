import { RedisService } from '@ecom-rmk/libs/redis';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { prisma } from 'prisma/prisma';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    // Initialize Kafka topics subscription if needed
  }

  getHello(): string {
    return 'Hello from User Service!';
  }

  async testRedis(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const testKey = 'test:redis:connection:user';
      const testValue = {
        timestamp: Date.now(),
        message: 'Redis test successful from User Service',
      };

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
        identityId: '507f1f77bcf86cd799439011', // Test identity ID
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
      };

      // Try to create a test user
      const result = await prisma.user.create({
        data: testData,
        select: {
          id: true,
          identityId: true,
          displayName: true,
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
}
