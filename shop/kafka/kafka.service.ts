import { KAFKA_SERVICES, KAFKA_TOPICS } from '@ecom-rmk/libs/kafka';
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ShopCreateInput } from 'generated/prisma/models';
import { ShopService } from 'src/shop.service';

@Injectable()
export class KafkaService {
  constructor(
    private readonly shopService: ShopService,
    @Inject(KAFKA_SERVICES.SHOP_SERVICE) private readonly kafkaClient: ClientKafka
  ) {}

  /**
   * Handle seller registered event - create shop
   * Implements saga pattern: emits failure event for rollback if creation fails
   */
  async handleSellerRegistered(data: { identityId: string; shop: ShopCreateInput }) {
    try {
      const shop = await this.shopService.createShopFromEvent({
        ...data.shop,
        ownerId: data.identityId,
      });

      // Emit Kafka event for shop.created to notify Identity service to add KOL role
      this.kafkaClient.emit(KAFKA_TOPICS.SHOP_CREATED, {
        shopId: shop.id,
        ownerId: shop.ownerId,
        name: shop.name,
        slug: shop.slug,
        createdAt: shop.createdAt,
      });

      return shop;
    } catch (error) {
      // Saga: emit failure event for identity service to rollback
      this.kafkaClient.emit(KAFKA_TOPICS.SHOP_CREATE_FAILED, {
        identityId: data.identityId,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }
}
