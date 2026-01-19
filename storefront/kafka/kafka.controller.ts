import { KAFKA_TOPICS } from '@ecom-rmk/libs/kafka';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { StorefrontCreateInput } from 'generated/prisma/models';
import { KafkaService } from './kafka.service';

// Event payload interface
interface IdentityKolRegisteredEvent {
  identityId: string;
  email: string;
  phoneNumber: string;
  storefront: StorefrontCreateInput;
  timestamp: string;
}

@Controller()
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * Handle IDENTITY_KOL_REGISTERED event from Identity service
   * Creates a storefront for the newly registered KOL
   */
  @EventPattern(KAFKA_TOPICS.IDENTITY_KOL_REGISTERED)
  async handleKolRegistered(@Payload() data: IdentityKolRegisteredEvent) {
    console.log('[Kafka] Received IDENTITY_KOL_REGISTERED event:', data.identityId);
    const storefront = await this.kafkaService.handleKolRegistered({
      identityId: data.identityId,
      storefront: data.storefront,
    });

    return storefront;
  }
}
