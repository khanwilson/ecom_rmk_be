import { KAFKA_SERVICES, KAFKA_TOPICS } from '@ecom-rmk/libs/kafka';
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { StorefrontCreateInput } from 'generated/prisma/models';
import { StorefrontService } from 'src/storefront.service';

@Injectable()
export class KafkaService {
  constructor(
    private readonly storefrontService: StorefrontService,
    @Inject(KAFKA_SERVICES.STOREFRONT_SERVICE) private readonly kafkaClient: ClientKafka
  ) {}

  /**
   * Handle KOL registered event - create storefront
   * Implements saga pattern: emits failure event for rollback if creation fails
   */
  async handleKolRegistered(data: { identityId: string; storefront: StorefrontCreateInput }) {
    try {
      const storefront = await this.storefrontService.createStorefrontFromEvent({
        ...data.storefront,
        ownerId: data.identityId,
      });

      // Emit Kafka event for storefront.created to notify Identity service to add KOL role
      this.kafkaClient.emit(KAFKA_TOPICS.STOREFRONT_CREATED, {
        storefrontId: storefront.id,
        ownerId: storefront.ownerId,
        name: storefront.name,
        slug: storefront.slug,
        createdAt: storefront.createdAt,
      });

      return storefront;
    } catch (error) {
      console.error('Error creating storefront for KOL:', error);
      // Saga: emit failure event for identity service to rollback
      this.kafkaClient.emit(KAFKA_TOPICS.STOREFRONT_CREATE_FAILED, {
        identityId: data.identityId,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }
}
