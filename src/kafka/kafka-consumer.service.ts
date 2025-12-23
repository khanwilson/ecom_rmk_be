import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class KafkaConsumerService {
  private readonly logger = new Logger(KafkaConsumerService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Handle order.created events with rate limiting
   * Example: Process new orders, send notifications, update inventory
   */
  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any, @Ctx() context: KafkaContext) {
    const originalMessage = context.getMessage();
    const { key, attributes, offset } = originalMessage;
    
    // Rate limit: Max 5 orders per user per minute
    const userId = data.userId || 'unknown';
    const rateLimitKey = `consumer:order:${userId}`;
    const rateLimit = await this.redisService.checkRateLimit(rateLimitKey, 5, 60);

    if (!rateLimit.allowed) {
      this.logger.warn(
        `⚠️ Rate limit exceeded for user ${userId} - skipping order event`,
      );
      return; // Skip processing
    }

    this.logger.log('📥 [Kafka Consumer] Received order.created event');
    this.logger.log(`   key: ${key}, attributes: ${attributes}, Offset: ${offset}`);
    this.logger.log(`   Data:`, data);
    this.logger.log(`   Rate limit remaining: ${rateLimit.remaining}`);

    // Business logic here
    await this.processOrder(data);
  }

  /**
   * Handle user.registered events with debounce
   * Example: Send welcome email, create user profile, analytics
   */
  @EventPattern('user.registered')
  async handleUserRegistered(@Payload() data: any, @Ctx() context: KafkaContext) {
    const { key } = context.getMessage();
    
    // Debounce: Only send welcome email once per 5 minutes per user
    const userId = data.userId || data.email || 'unknown';
    const debounceKey = `debounce:welcome:${userId}`;
    const allowed = await this.redisService.debounce(debounceKey, 300);

    if (!allowed) {
      this.logger.warn(`⚠️ Debounced welcome email for user ${userId}`);
      return;
    }

    this.logger.log('📥 [Kafka Consumer] Received user.registered event');
    this.logger.log(`   key: ${key}`);
    this.logger.log(`   Data:`, data);

    // Send welcome email, etc.
    await this.sendWelcomeEmail(data);
  }

  /**
   * Handle test events for debugging
   */
  @EventPattern('test-topic')
  async handleTestEvent(@Payload() data: any) {
    console.log('📥 [Kafka Consumer] Received test event:', data);
  }

  // Private helper methods
  private async processOrder(orderData: any) {
    console.log('   Processing order:', orderData.orderId || 'N/A');
    // Your business logic here
  }

  private async sendWelcomeEmail(userData: any) {
    console.log('   Sending welcome email to:', userData.email || 'N/A');
    // Email sending logic here
  }
}

