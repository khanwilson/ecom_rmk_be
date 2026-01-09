/**
 * Kafka Event Types
 * Define all kafka events for communication between services
 */

// Product Kafka Events
export enum ProductKafkaEvents {
  // Product Service Events
  PRODUCT_CREATE_INITIATED = 'product.create.initiated',
  PRODUCT_CREATED = 'product.created',
  PRODUCT_CREATE_FAILED = 'product.create.failed',
  PRODUCT_UPDATE_STATUS = 'product.update.status',
  PRODUCT_COMPENSATE = 'product.compensate',

  // Identity Service Events (in response to product kafka)
  SELLER_VERIFY_REQUESTED = 'seller.verify.requested',
  SELLER_VERIFIED = 'seller.verified',
  SELLER_VERIFICATION_FAILED = 'seller.verification.failed',
}

// Kafka Event Payloads
export interface ProductCreateInitiatedPayload {
  kafkaId: string;
  productId: string;
  sellerId: string;
  productData: {
    name: string;
    sku: string;
    price: number;
    [key: string]: any;
  };
  timestamp: string;
}

export interface ProductCreatedPayload {
  kafkaId: string;
  productId: string;
  sellerId: string;
  product: any;
  timestamp: string;
}

export interface SellerVerifyRequestedPayload {
  kafkaId: string;
  productId: string;
  sellerId: string;
  timestamp: string;
}

export interface SellerVerifiedPayload {
  kafkaId: string;
  productId: string;
  sellerId: string;
  verified: boolean;
  timestamp: string;
}

export interface SellerVerificationFailedPayload {
  kafkaId: string;
  productId: string;
  sellerId: string;
  reason: string;
  timestamp: string;
}

export interface ProductCompensatePayload {
  kafkaId: string;
  productId: string;
  reason: string;
  timestamp: string;
}
