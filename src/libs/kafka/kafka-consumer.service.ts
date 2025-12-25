import { Injectable, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { RedisService } from 'libs/redis';

@Injectable()
export class KafkaConsumerService {
  private readonly logger = new Logger(KafkaConsumerService.name);

  constructor(private readonly redisService: RedisService) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any, @Ctx() context: KafkaContext) {
    const originalMessage = context.getMessage();
    const { key, attributes, offset } = originalMessage;

    const userId = data.userId || 'unknown';
    const rateLimitKey = `consumer:order:${userId}`;
    const rateLimit = await this.redisService.checkRateLimit(rateLimitKey, 5, 60);

    if (!rateLimit.allowed) {
      this.logger.warn(`⚠️ Rate limit exceeded for user ${userId} - skipping order event`);
      return;
    }

    this.logger.log('📥 [Kafka Consumer] Received order.created event');
    this.logger.log(`   key: ${key}, attributes: ${attributes}, Offset: ${offset}`);
    this.logger.log(`   Data:`, data);
    this.logger.log(`   Rate limit remaining: ${rateLimit.remaining}`);

    await this.processOrder(data);
  }

  @EventPattern('user.registered')
  async handleUserRegistered(@Payload() data: any, @Ctx() context: KafkaContext) {
    const { key } = context.getMessage();

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

    await this.sendWelcomeEmail(data);
  }

  @EventPattern('test-topic')
  async handleTestEvent(@Payload() data: any) {
    console.log('📥 [Kafka Consumer] Received test event:', data);
  }

  private async processOrder(orderData: any) {
    console.log('   Processing order:', orderData.orderId || 'N/A');
  }

  private async sendWelcomeEmail(userData: any) {
    console.log('   Sending welcome email to:', userData.email || 'N/A');
  }
}


