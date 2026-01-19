export enum KAFKA_SERVICES {
  IDENTITY_SERVICE = 'IDENTITY_SERVICE',
  PRODUCT_SERVICE = 'PRODUCT_SERVICE',
  USER_SERVICE = 'USER_SERVICE',
  SHOP_SERVICE = 'SHOP_SERVICE',
  STOREFRONT_SERVICE = 'STOREFRONT_SERVICE',
}

export enum KAFKA_TOPICS {
  HELLO = 'ecom.hello',

  PRODUCT_CREATE = 'ecom.product.create',

  // Identity events (role registration)
  IDENTITY_SELLER_REGISTERED = 'ecom.identity.seller.registered',
  IDENTITY_KOL_REGISTERED = 'ecom.identity.kol.registered',

  // Shop events
  SHOP_CREATED = 'ecom.shop.created',
  SHOP_UPDATED = 'ecom.shop.updated',
  SHOP_VERIFIED = 'ecom.shop.verified',
  SHOP_CREATE_FAILED = 'ecom.shop.create.failed', // Saga: rollback identity

  // Storefront events
  STOREFRONT_CREATED = 'ecom.storefront.created',
  STOREFRONT_UPDATED = 'ecom.storefront.updated',
  STOREFRONT_VERIFIED = 'ecom.storefront.verified',
  STOREFRONT_CREATE_FAILED = 'ecom.storefront.create.failed', // Saga: rollback identity
}
