import { Injectable } from '@nestjs/common';
import { ShopCreateInput } from 'generated/prisma/models';
import { prisma } from 'prisma/prisma';

@Injectable()
export class KafkaService {
  /**
   * Handle seller registered event - create shop
   */
  async handleSellerRegistered(data: { identityId: string; shop: ShopCreateInput }) {
    return prisma.shop.create({
      data: {
        ...data.shop,
        ownerId: data.identityId,
      },
    });
  }
}
