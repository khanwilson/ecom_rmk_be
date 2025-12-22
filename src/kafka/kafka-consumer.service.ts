import { Injectable } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Injectable()
export class KafkaConsumerService {
  /**
   * Handle order.created events
   * Example: Process new orders, send notifications, update inventory
   */
  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any, @Ctx() context: KafkaContext) {
    const originalMessage = context.getMessage();
    const { key, attributes, offset } = originalMessage;
    
    console.log('📥 [Kafka Consumer] Received order.created event');
    console.log(`   key: ${key}, attributes: ${attributes}, Offset: ${offset}`);
    console.log('   Data:', data);

    // Business logic here
    // Example: Send email, update database, trigger other services
    
    // Simulate processing
    await this.processOrder(data);
  }

  /**
   * Handle user.registered events
   * Example: Send welcome email, create user profile, analytics
   */
  @EventPattern('user.registered')
  async handleUserRegistered(@Payload() data: any, @Ctx() context: KafkaContext) {
    const { key } = context.getMessage();
    
    console.log('📥 [Kafka Consumer] Received user.registered event');
    console.log(`   key: ${key}`);
    console.log('   Data:', data);

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

