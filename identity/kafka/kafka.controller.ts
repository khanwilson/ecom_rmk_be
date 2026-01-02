import { KAFKA_TOPICS, ProductKafkaEvents, SellerVerifyRequestedPayload } from '@ecom-rmk/libs/kafka';
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';

@Controller('kafka')
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) { }

  /**
   * Handle Message from Product Service (test messages)
   */
  @MessagePattern(KAFKA_TOPICS.HELLO)
  async handleProductMessage(@Payload() payload: any) {
    console.log('📨 Identity service received message from Product:', payload);
    return {
      success: true,
      message: 'Message received by Identity service',
      receivedAt: new Date().toISOString(),
      payload,
    };
  }

  /**
   * Handle Kafka Events from Product Service
   */
  @EventPattern(KAFKA_TOPICS.PRODUCT_CREATE)
  async handleKafkaEvent(@Payload() payload: any) {
    const { eventType, payload: eventPayload } = payload;

    switch (eventType) {
      case ProductKafkaEvents.SELLER_VERIFY_REQUESTED:
        return this.kafkaService.handleSellerVerifyRequested(
          eventPayload as SellerVerifyRequestedPayload,
        );

      default:
        console.log(`Unknown kafka event type: ${eventType}`);
    }
  }
}

