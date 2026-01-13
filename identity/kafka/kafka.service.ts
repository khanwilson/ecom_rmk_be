import {
  KAFKA_SERVICES,
  KAFKA_TOPICS,
  ProductKafkaEvents,
  type SellerVerificationFailedPayload,
  type SellerVerifiedPayload,
  type SellerVerifyRequestedPayload,
} from '@ecom-rmk/libs/kafka';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { IdentityStatus } from 'generated/prisma/enums';
import { prisma } from 'prisma/prisma';

@Injectable()
export class KafkaService {
  private readonly logger = new Logger(KafkaService.name);

  constructor(
    @Inject(KAFKA_SERVICES.IDENTITY_SERVICE) private readonly identityClient: ClientKafka
  ) {}

  /**
   * Handle Seller Verification Request
   * Verify that the seller identity exists and is active
   */
  async handleSellerVerifyRequested(payload: SellerVerifyRequestedPayload) {
    const { kafkaId, productId, sellerId } = payload;
    this.logger.log(`🔍 Verifying seller for kafka: ${kafkaId}, sellerId: ${sellerId}`);

    try {
      // Verify seller identity exists and is active
      const identity = await prisma.identity.findUnique({
        where: { id: sellerId },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          phoneCountry: true,
          status: true,
          emailVerified: true,
        },
      });

      if (!identity) {
        this.logger.warn(`❌ Seller not found: ${sellerId}`);
        await this.sendVerificationFailed(
          kafkaId,
          productId,
          sellerId,
          'Seller identity not found'
        );
        return;
      }

      // Check if identity is in valid status
      const validStatuses: IdentityStatus[] = [IdentityStatus.AVAILABLE];
      if (!validStatuses.includes(identity.status)) {
        this.logger.warn(`❌ Seller status invalid: ${identity.status} for sellerId: ${sellerId}`);
        await this.sendVerificationFailed(
          kafkaId,
          productId,
          sellerId,
          `Seller account is ${identity.status.toLowerCase()}`
        );
        return;
      }

      // Check if email is verified (optional requirement)
      if (!identity.emailVerified) {
        this.logger.warn(`❌ Seller email not verified: ${sellerId}`);
        await this.sendVerificationFailed(
          kafkaId,
          productId,
          sellerId,
          'Seller email not verified'
        );
        return;
      }

      // Seller is valid - send verification success
      this.logger.log(`✅ Seller verified: ${sellerId}`);
      await this.sendVerificationSuccess(kafkaId, productId, sellerId);
    } catch (error) {
      this.logger.error(`❌ Error verifying seller ${sellerId}:`, error);
      await this.sendVerificationFailed(
        kafkaId,
        productId,
        sellerId,
        `Verification error: ${error.message}`
      );
    }
  }

  /**
   * Send Seller Verification Success Event
   */
  private async sendVerificationSuccess(kafkaId: string, productId: string, sellerId: string) {
    const payload: SellerVerifiedPayload = {
      kafkaId,
      productId,
      sellerId,
      verified: true,
      timestamp: new Date().toISOString(),
    };

    this.identityClient.emit(KAFKA_TOPICS.PRODUCT_CREATE, {
      eventType: ProductKafkaEvents.SELLER_VERIFIED,
      payload,
    });

    this.logger.log(`📤 Published SELLER_VERIFIED event for kafka: ${kafkaId}`);
  }

  /**
   * Send Seller Verification Failed Event
   */
  private async sendVerificationFailed(
    kafkaId: string,
    productId: string,
    sellerId: string,
    reason: string
  ) {
    const payload: SellerVerificationFailedPayload = {
      kafkaId,
      productId,
      sellerId,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.identityClient.emit(KAFKA_TOPICS.PRODUCT_CREATE, {
      eventType: ProductKafkaEvents.SELLER_VERIFICATION_FAILED,
      payload,
    });

    this.logger.log(`📤 Published SELLER_VERIFICATION_FAILED event for kafka: ${kafkaId}`);
  }
}
