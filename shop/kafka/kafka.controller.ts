import { KAFKA_TOPICS } from '@ecom-rmk/libs/kafka';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ShopCreateInput } from 'generated/prisma/models';
import { KafkaService } from './kafka.service';

// Event payload interface
interface IdentitySellerRegisteredEvent {
  identityId: string;
  email: string;
  phoneNumber: string;
  shop: ShopCreateInput;
  timestamp: string;
}

@Controller()
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * Handle IDENTITY_SELLER_REGISTERED event from Identity service
   * Creates a shop for the newly registered seller
   */
  @EventPattern(KAFKA_TOPICS.IDENTITY_SELLER_REGISTERED)
  async handleSellerRegistered(@Payload() data: IdentitySellerRegisteredEvent) {
    console.log('[Kafka] Received IDENTITY_SELLER_REGISTERED event:', data.identityId);
    try {
      const shop = await this.kafkaService.handleSellerRegistered({
        identityId: data.identityId,
        shop: data.shop,
      });

      console.log('[KafkaController] Shop created successfully:', shop.id);
      return shop;
    } catch (error) {
      console.error('[KafkaController] Failed to create shop:', error);
      // Log but don't throw - event processing should be resilient
      // TODO: Consider adding retry mechanism or dead letter queue
    }
  }
}
