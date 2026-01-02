import {
  KAFKA_TOPICS,
  ProductKafkaEvents,
  SellerVerificationFailedPayload,
  SellerVerifiedPayload,
} from '@ecom-rmk/libs/kafka';
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';

@Controller('kafka')
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) { }

  /**
   * Handle Message from Identity Service
   */
  @MessagePattern(KAFKA_TOPICS.HELLO)
  async handleIdentityMessage(@Payload() payload: any) {
    console.log('📨 Product service received message from Identity:', payload);
    return {
      success: true,
      message: 'Message received by Product service',
      receivedAt: new Date().toISOString(),
      payload,
    };
  }

  /**
   * Handle Kafka Events from Identity Service
   */
  @EventPattern(KAFKA_TOPICS.PRODUCT_CREATE)
  async handleKafkaEvent(@Payload() payload: any) {
    const { eventType, payload: eventPayload } = payload;

    switch (eventType) {
      case ProductKafkaEvents.SELLER_VERIFIED:
        return this.kafkaService.handleSellerVerified(
          eventPayload as SellerVerifiedPayload,
        );

      case ProductKafkaEvents.SELLER_VERIFICATION_FAILED:
        return this.kafkaService.handleSellerVerificationFailed(
          eventPayload as SellerVerificationFailedPayload,
        );

      default:
        console.log(`Unknown kafka event type: ${eventType}`);
    }
  }
}

