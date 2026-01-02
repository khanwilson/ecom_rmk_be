import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { RedisService } from '@ecom-rmk/libs/redis';
import {
  ProductKafkaEvents,
  ProductCreateInitiatedPayload,
  ProductCreatedPayload,
  SellerVerifiedPayload,
  SellerVerificationFailedPayload,
  ProductCompensatePayload,
  SagaStatus,
  SagaStepStatus,
  KAFKA_SERVICES,
  KAFKA_TOPICS,
} from '@ecom-rmk/libs/kafka';
import { ProductStatus } from 'generated/prisma/enums';
import { prisma } from 'prisma/prisma';
import { handleError } from '@ecom-rmk/libs/common';
// Generate unique kafka ID
function generateKafkaId(): string {
  return `kafka-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

@Injectable()
export class KafkaService {
  private readonly logger = new Logger(KafkaService.name);
  private readonly SAGA_TTL = 300; // 5 minutes

  constructor(
    private readonly redisService: RedisService,
    @Inject(KAFKA_SERVICES.PRODUCT_SERVICE) private readonly productClient: ClientKafka,
  ) { }

  /**
   * Initiate Product Creation Saga
   * Step 1: Create Product with PENDING status
   * Step 2: Request seller verification from Identity Service
   */
  async createProductWithSaga(productData: {
    name: string;
    description?: string;
    sku: string;
    price: number;
    type?: string;
    stock?: number;
    sellerId: string;
  }) {
    const kafkaId = generateKafkaId();
    this.logger.log(`🚀 Starting Product Creation Kafka: ${kafkaId}`);

    try {
      // Step 1: Create Product with PENDING status (within transaction for atomicity)
      const product = await prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            name: productData.name,
            description: productData.description,
            sku: productData.sku,
            price: productData.price,
            type: (productData.type as any) || 'PHYSICAL',
            stock: productData.stock || 0,
            status: ProductStatus.DRAFT, // Will be ACTIVE after seller verification
          },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            status: true,
            createdAt: true,
          },
        });

        return createdProduct;
      });

      // Store kafka context in Redis
      const kafkaContext = {
        kafkaId,
        status: SagaStatus.IN_PROGRESS,
        steps: [
          {
            stepId: 'product-created',
            service: 'PRODUCT_SERVICE',
            action: 'CREATE_PRODUCT',
            status: SagaStepStatus.SUCCESS,
            data: { productId: product.id },
            timestamp: new Date().toISOString(),
          },
        ],
        payload: { productId: product.id, sellerId: productData.sellerId },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.redisService.set(`kafka:${kafkaId}`, kafkaContext, this.SAGA_TTL);

      // Step 2: Publish event to request seller verification
      const verifyPayload: ProductCreateInitiatedPayload = {
        kafkaId,
        productId: product.id,
        sellerId: productData.sellerId,
        productData: {
          name: product.name,
          sku: product.sku,
          price: product.price,
        },
        timestamp: new Date().toISOString(),
      };

      this.productClient.emit(KAFKA_TOPICS.PRODUCT_CREATE, {
        eventType: ProductKafkaEvents.SELLER_VERIFY_REQUESTED,
        payload: verifyPayload,
      });

      this.logger.log(
        `📤 Published SELLER_VERIFY_REQUESTED event for kafka: ${kafkaId}`,
      );

      return {
        kafkaId,
        product,
        message: 'Product created. Seller verification in progress.',
      };
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Handle Seller Verification Success
   * Step 3: Update Product status to ACTIVE
   */
  async handleSellerVerified(payload: SellerVerifiedPayload) {
    const { kafkaId, productId } = payload;
    this.logger.log(`✅ Seller verified for kafka: ${kafkaId}`);

    try {
      // Update kafka context
      const kafkaContext = await this.redisService.get<any>(`kafka:${kafkaId}`);
      if (kafkaContext) {
        kafkaContext.steps.push({
          stepId: 'seller-verified',
          service: 'IDENTITY_SERVICE',
          action: 'VERIFY_SELLER',
          status: SagaStepStatus.SUCCESS,
          timestamp: new Date().toISOString(),
        });
        kafkaContext.status = SagaStatus.COMPLETED;
        kafkaContext.updatedAt = new Date().toISOString();
        await this.redisService.set(`kafka:${kafkaId}`, kafkaContext, this.SAGA_TTL);
      }

      // Update product status to ACTIVE
      const product = await prisma.product.update({
        where: { id: productId },
        data: { status: ProductStatus.ACTIVE as any },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          status: true,
          updatedAt: true,
        },
      });

      this.logger.log(`✅ Product ${productId} activated successfully`);

      // Publish completion event (optional - for logging/monitoring)
      this.productClient.emit(KAFKA_TOPICS.PRODUCT_CREATE, {
        eventType: ProductKafkaEvents.PRODUCT_UPDATE_STATUS,
        payload: {
          kafkaId,
          productId,
          status: 'ACTIVE',
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true, product };
    } catch (error) {
      this.logger.error(`❌ Failed to activate product ${productId}:`, error);
      // Trigger compensation
      await this.compensate(kafkaId, productId, error.message);
      throw handleError(error);
    }
  }

  /**
   * Handle Seller Verification Failure
   * Trigger compensation to rollback product creation
   */
  async handleSellerVerificationFailed(
    payload: SellerVerificationFailedPayload,
  ) {
    const { kafkaId, productId, reason } = payload;
    this.logger.warn(
      `❌ Seller verification failed for kafka: ${kafkaId}, reason: ${reason}`,
    );

    // Trigger compensation
    await this.compensate(kafkaId, productId, reason);
  }

  /**
   * Compensation: Rollback Product Creation
   * Delete the product that was created
   */
  async compensate(kafkaId: string, productId: string, reason: string) {
    this.logger.log(`🔄 Starting compensation for kafka: ${kafkaId}`);

    try {
      // Update kafka context
      const kafkaContext = await this.redisService.get<any>(`kafka:${kafkaId}`);
      if (kafkaContext) {
        kafkaContext.status = SagaStatus.COMPENSATING;
        kafkaContext.updatedAt = new Date().toISOString();
        await this.redisService.set(`kafka:${kafkaId}`, kafkaContext, this.SAGA_TTL);
      }

      // Soft delete the product (or hard delete if preferred)
      await prisma.product.update({
        where: { id: productId },
        data: {
          status: ProductStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      // Update kafka context
      if (kafkaContext) {
        kafkaContext.steps.push({
          stepId: 'product-compensated',
          service: 'PRODUCT_SERVICE',
          action: 'COMPENSATE_PRODUCT',
          status: SagaStepStatus.COMPENSATED,
          data: { productId, reason },
          timestamp: new Date().toISOString(),
        });
        kafkaContext.status = SagaStatus.COMPENSATED;
        kafkaContext.updatedAt = new Date().toISOString();
        await this.redisService.set(`kafka:${kafkaId}`, kafkaContext, this.SAGA_TTL);
      }

      this.logger.log(`✅ Compensation completed for kafka: ${kafkaId}`);

      // Publish compensation event
      const compensatePayload: ProductCompensatePayload = {
        kafkaId,
        productId,
        reason,
        timestamp: new Date().toISOString(),
      };

      this.productClient.emit(KAFKA_TOPICS.PRODUCT_CREATE, {
        eventType: ProductKafkaEvents.PRODUCT_COMPENSATE,
        payload: compensatePayload,
      });
    } catch (error) {
      this.logger.error(`❌ Compensation failed for kafka: ${kafkaId}:`, error);
      // Update kafka to failed status
      const kafkaContext = await this.redisService.get<any>(`kafka:${kafkaId}`);
      if (kafkaContext) {
        kafkaContext.status = SagaStatus.FAILED;
        kafkaContext.updatedAt = new Date().toISOString();
        await this.redisService.set(`kafka:${kafkaId}`, kafkaContext, this.SAGA_TTL);
      }
      throw handleError(error);
    }
  }

  /**
   * Get Kafka Status
   */
  async getKafkaStatus(kafkaId: string) {
    const kafkaContext = await this.redisService.get<any>(`kafka:${kafkaId}`);
    return kafkaContext || null;
  }
}

