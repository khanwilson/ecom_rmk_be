# E-commerce System Architecture (Shopee-like)

## System Overview

Hệ thống e-commerce microservices với kiến trúc tương tự Shopee, hỗ trợ:
- Multi-role: 1 tài khoản có thể là Buyer, Seller, KOL
- Shop management: Mỗi Seller có 1 Shop để bán hàng
- Storefront management: Mỗi KOL có 1 Storefront để bán affiliate
- Inventory management: Shop inventory → Warehouse → Customer
- Order flow: Cart → Order → Payment (30min timeout) → Shipping
- Return flow: Customer → Warehouse → Shop

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   API Gateway / Load Balancer                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
        ┌─────────────────┬───────────────────┼───────────────────┬─────────────────┐
        │                 │                   │                   │                 │
┌───────▼────────┐ ┌──────▼───────┐ ┌─────────▼─────────┐ ┌───────▼───────┐ ┌───────▼────────────┐
│ Identity Svc   │ │  User Svc    │ │    Shop Svc       │ │Storefront Svc │ │   Product Svc      │
│                │ │              │ │    (Seller)       │ │ (KOL Aff)     │ │                    │
│ Collections:   │ │ Collections: │ │ Collections:      │ │ Collections:  │ │ Collections:       │
│ - Identity     │ │ - User       │ │ - Shop            │ │ - Storefront  │ │ - Product          │
│ - OTP          │ │ - UserAddr   │ │ - ShopSettings    │ │ - SFProduct   │ │ - ProductCategory  │
│                │ │ - UserPref   │ │ - ShopVerify      │ │ - SFCategory  │ │ - ProductVariant   │
│                │ │              │ │ - ShopCategory    │ │ - SFSettings  │ │ - ProductImage     │
└───────┬────────┘ └──────┬───────┘ └─────────┬─────────┘ └───────┬───────┘ └────────┬───────────┘
        │                 │                   │                   │                  │
        └─────────────────┴───────────────────┼───────────────────┴──────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
┌───────▼──────────────┐         ┌────────────▼────────────┐        ┌───────────────▼───────┐
│ InventoryShop Svc    │         │       Cart Svc          │        │     Order Svc         │
│                      │         │                         │        │                       │
│ Collections:         │         │ Collections:            │        │ Collections:          │
│ - InventoryShop      │         │ - Cart                  │        │ - Order               │
│ - InventoryMovement  │         │ - CartItem              │        │ - OrderItem           │
│                      │         │                         │        │ - OrderTracking       │
└───────┬──────────────┘         └────────────┬────────────┘        └───────────┬───────────┘
        │                                     │                                 │
        └─────────────────────────────────────┼─────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────┐
        │                                     │                                 │
┌───────▼────────────┐         ┌──────────────▼──────────────┐        ┌─────────▼─────────┐
│   Payment Svc      │         │      Promotion Svc          │        │  Warehouse Svc    │
│                    │         │                             │        │                   │
│ Collections:       │         │ Collections:                │        │ Collections:      │
│ - Payment          │         │ - Promotion                 │        │ - Warehouse       │
│ - PaymentMethod    │         │ - Voucher                   │        │ - WarehouseLoc    │
│ - PaymentTxn       │         │ - Campaign, FlashSale       │        │                   │
└───────┬────────────┘         └──────────────┬──────────────┘        └─────────┬─────────┘
        │                                     │                                 │
        └─────────────────────────────────────┼─────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────┐
        │                                     │                                 │
┌───────▼────────────────┐         ┌──────────▼──────────┐        ┌─────────────▼─────────┐
│InventoryWarehouse Svc  │         │    Shipping Svc     │        │                       │
│                        │         │                     │        │                       │
│ Collections:           │         │ Collections:        │        │                       │
│ - InventoryWarehouse   │         │ - Shipping          │        │                       │
│ - WarehouseMovement    │         │ - ShippingMethod    │        │                       │
│                        │         │ - ShippingTracking  │        │                       │
└───────┬────────────────┘         └──────────┬──────────┘        └───────────────────────┘
        │                                     │                                 │
        └─────────────────────────────────────┼─────────────────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                      ┌───────▼────────┐            ┌─────────▼──────┐
                      │     Redis      │            │     Kafka      │
                      │   (Cache/Pub)  │            │   (Events)     │
                      └────────────────┘            └────────────────┘
                              │                               │
                              └───────────────┬───────────────┘
                                              │
                                      ┌───────▼─────────┐
                                      │    MongoDB      │
                                      │  (Databases)    │
                                      └─────────────────┘
```

## Service Details

### 1. Identity Service
**Purpose**: Authentication & Authorization only
- **Database**: `DATABASE_URL_IDENTITY`
- **Collections**:
  - `Identity`: Login credentials, JWT tokens, roles (USER/SELLER/KOL/ADMIN)
  - `OTP`: OTP codes for email verification, password reset, 2FA

### 2. User Service
**Purpose**: User profiles, addresses, preferences
- **Database**: `DATABASE_URL_USER`
- **Collections**:
  - `User`: Profile info (name, avatar, birthday, gender, etc.)
  - `UserAddress`: Multiple delivery addresses
  - `UserPreference`: User settings, notifications preferences

### 3. Shop Service
**Purpose**: Shop management for Sellers (1 Seller = 1 Shop)
- **Database**: `DATABASE_URL_SHOP`
- **Collections**:
  - `Shop`: Shop info (name, description, logo, ownerId)
  - `ShopCategory`: Product categories for shop (hierarchical)
  - `ShopSettings`: Shop configuration, policies
  - `ShopVerification`: Verification status, documents

### 4. Storefront Service
**Purpose**: Storefront management for KOLs to sell affiliate products (1 KOL = 1 Storefront)
- **Database**: `DATABASE_URL_STOREFRONT`
- **Collections**:
  - `Storefront`: Storefront info (name, description, logo, ownerId, commissionRate)
  - `StorefrontProduct`: Products curated by KOL from various shops (productId, shopId, customDescription)
  - `StorefrontCategory`: KOL's custom product categories
  - `StorefrontSettings`: Storefront configuration

### 6. Product Service
**Purpose**: Product catalog management
- **Database**: `DATABASE_URL_PRODUCT`
- **Collections**:
  - `Product`: Product info (name, description, price, shopId)
  - `ProductCategory`: Category hierarchy
  - `ProductVariant`: Sizes, colors, SKUs
  - `ProductImage`: Product images

### 7. Inventory Shop Service
**Purpose**: Stock management at shop level
- **Database**: `DATABASE_URL_INVENTORY_SHOP`
- **Collections**:
  - `InventoryShop`: Stock quantity per shop/product/variant
  - `InventoryMovement`: Stock movement logs (in/out/reserved)

### 8. Cart Service
**Purpose**: Shopping cart management
- **Database**: `DATABASE_URL_CART`
- **Collections**:
  - `Cart`: User cart (one per user)
  - `CartItem`: Items in cart (product, variant, quantity)

### 9. Order Service
**Purpose**: Order management & lifecycle
- **Database**: `DATABASE_URL_ORDER`
- **Collections**:
  - `Order`: Order info (user, shop, total, status, payment deadline)
  - `OrderItem`: Order items (product, variant, quantity, price)
  - `OrderTracking`: Order status change history

### 10. Payment Service
**Purpose**: Payment processing
- **Database**: `DATABASE_URL_PAYMENT`
- **Collections**:
  - `Payment`: Payment records (order, amount, method, status)
  - `PaymentMethod`: Available payment methods
  - `PaymentTransaction`: Payment transaction logs

### 11. Promotion Service
**Purpose**: Discounts, vouchers, campaigns
- **Database**: `DATABASE_URL_PROMOTION`
- **Collections**:
  - `Promotion`: General promotions
  - `Voucher`: Voucher codes
  - `Campaign`: Marketing campaigns
  - `FlashSale`: Flash sale events

### 12. Warehouse Service
**Purpose**: Warehouse & location management
- **Database**: `DATABASE_URL_WAREHOUSE`
- **Collections**:
  - `Warehouse`: Warehouse info (name, address, type)
  - `WarehouseLocation`: Storage locations within warehouse

### 13. Inventory Warehouse Service
**Purpose**: Stock management at warehouse level
- **Database**: `DATABASE_URL_INVENTORY_WAREHOUSE`
- **Collections**:
  - `InventoryWarehouse`: Stock quantity per warehouse/product
  - `WarehouseMovement`: Stock movement between warehouses

### 14. Shipping Service
**Purpose**: Shipping & logistics management
- **Database**: `DATABASE_URL_SHIPPING`
- **Collections**:
  - `Shipping`: Shipping records (order, route, status)
  - `ShippingMethod`: Available shipping methods
  - `ShippingTracking`: Tracking history (warehouse stops)

## Business Flow

### Order Flow
1. User adds to cart or clicks "Buy Now"
2. Cart/Order created → InventoryShop reserved (stock deducted)
3. User proceeds to payment → 30min timer starts
4. Payment success → Order confirmed → InventoryShop committed
5. Order → Shipping → Route: Shop → Warehouse(s) → Customer
6. If payment timeout (30min) → Order cancelled → InventoryShop released

### Return Flow
1. Customer initiates return
2. Return order created
3. Shipping → Route: Customer → Warehouse(s) → Shop
4. InventoryShop restored when received at shop

## Prisma Schemas

### 1. Identity Service Schema
**File**: `identity/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_IDENTITY")
}

enum IdentityStatus {
  AVAILABLE
  LOCKED
  BANNED
  DELETED
  PENDING
  NAN
}

enum Role {
  USER
  SELLER
  KOL
  ADMIN
}

enum OtpType {
  EMAIL_VERIFY
  RESET_PWD
  LOGIN_2FA
}

model Identity {
  id                String         @id @default(auto()) @map("_id") @db.ObjectId
  email             String         @unique
  phoneNumber       String         @unique
  phoneCountry      String
  passwordHash      String
  refreshTokenHash  String?
  status            IdentityStatus @default(PENDING)
  emailVerified     Boolean        @default(false)
  lastLogin         DateTime?
  failedLoginCount  Int            @default(0)
  lastFailedLoginAt DateTime?
  provider          String         @default("local")
  roles             Role[]         @default([USER])
  metadata          Json?
  deletedAt         DateTime?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  otps Otp[]

  @@index([status])
  @@index([lastLogin])
  @@map("Identity")
}

model Otp {
  id         String    @id @default(auto()) @map("_id") @db.ObjectId
  identityId String    @db.ObjectId
  code       String
  type       OtpType
  expiredAt  DateTime
  consumedAt DateTime?
  retryCount Int       @default(0)
  sentCount  Int       @default(0)
  createdAt  DateTime  @default(now())

  identity Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)

  @@index([identityId, type])
  @@index([expiredAt])
  @@map("Otp")
}
```

### 2. User Service Schema
**File**: `user/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_USER")
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

model User {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  identityId  String    @unique @db.ObjectId
  firstName   String?
  lastName    String?
  displayName String?
  avatar      String?
  birthday    DateTime?
  gender      Gender?
  metadata    Json?
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  addresses   UserAddress[]
  preferences UserPreference?

  @@index([identityId])
  @@map("User")
}

model UserAddress {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String   @db.ObjectId
  label       String
  fullName    String
  phoneNumber String
  address     String
  ward        String?
  district    String?
  province    String?
  postalCode  String?
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("UserAddress")
}

model UserPreference {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  userId          String   @unique @db.ObjectId
  language        String   @default("vi")
  currency        String   @default("VND")
  emailNotifications Boolean @default(true)
  smsNotifications  Boolean @default(false)
  pushNotifications Boolean @default(true)
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("UserPreference")
}
```

### 3. Shop Service Schema
**File**: `shop/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_SHOP")
}

enum ShopStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING_VERIFICATION
  VERIFIED
}

model Shop {
  id          String     @id @default(auto()) @map("_id") @db.ObjectId
  ownerId     String     @unique @db.ObjectId // Identity service user id (Seller)
  name        String
  slug        String     @unique
  description String?
  logo        String?
  coverImage  String?
  status      ShopStatus @default(PENDING_VERIFICATION)
  rating      Float      @default(0)
  totalSales  Int        @default(0)
  metadata    Json?
  deletedAt   DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  categories    ShopCategory[]
  settings      ShopSettings?
  verification  ShopVerification?

  @@index([status])
  @@map("Shop")
}

model ShopCategory {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  shopId      String   @db.ObjectId
  parentId    String?  @db.ObjectId
  name        String
  slug        String
  description String?
  image       String?
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  shop     Shop             @relation(fields: [shopId], references: [id], onDelete: Cascade)
  parent   ShopCategory?    @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children ShopCategory[]   @relation("CategoryHierarchy")

  @@unique([shopId, slug])
  @@index([shopId])
  @@index([parentId])
  @@index([isActive])
  @@map("ShopCategory")
}

model ShopSettings {
  id                    String   @id @default(auto()) @map("_id") @db.ObjectId
  shopId                String   @unique @db.ObjectId
  autoAcceptOrder       Boolean  @default(false)
  shippingPolicy        String?
  returnPolicy          String?
  warrantyPolicy        String?
  minOrderValue         Float?
  freeShippingThreshold Float?
  metadata              Json?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@map("ShopSettings")
}

model ShopVerification {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  shopId          String    @unique @db.ObjectId
  isVerified      Boolean   @default(false)
  verifiedAt      DateTime?
  documents       Json?
  rejectionReason String?
  metadata        Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@map("ShopVerification")
}
```

### 4. Storefront Service Schema
**File**: `storefront/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_STOREFRONT")
}

enum StorefrontStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING_VERIFICATION
  VERIFIED
}

model Storefront {
  id             String           @id @default(auto()) @map("_id") @db.ObjectId
  ownerId        String           @unique @db.ObjectId // Identity service user id (KOL)
  name           String
  slug           String           @unique
  description    String?
  logo           String?
  coverImage     String?
  status         StorefrontStatus @default(PENDING_VERIFICATION)
  commissionRate Float            @default(0) // Affiliate commission rate (%)
  totalEarnings  Float            @default(0)
  totalSales     Int              @default(0)
  metadata       Json?
  deletedAt      DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  products   StorefrontProduct[]
  categories StorefrontCategory[]
  settings   StorefrontSettings?

  @@index([status])
  @@map("Storefront")
}

model StorefrontProduct {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  storefrontId      String   @db.ObjectId
  productId         String   @db.ObjectId // Reference to Product service
  shopId            String   @db.ObjectId // Reference to Shop service (origin shop)
  categoryId        String?  @db.ObjectId // StorefrontCategory id
  customTitle       String?  // KOL's custom title
  customDescription String?  // KOL's custom description/review
  customImage       String?  // KOL's custom image
  commissionRate    Float?   // Override storefront commission rate
  isActive          Boolean  @default(true)
  order             Int      @default(0)
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  storefront Storefront          @relation(fields: [storefrontId], references: [id], onDelete: Cascade)
  category   StorefrontCategory? @relation(fields: [categoryId], references: [id])

  @@unique([storefrontId, productId])
  @@index([storefrontId])
  @@index([productId])
  @@index([shopId])
  @@index([categoryId])
  @@index([isActive])
  @@map("StorefrontProduct")
}

model StorefrontCategory {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  storefrontId String   @db.ObjectId
  parentId     String?  @db.ObjectId
  name         String
  slug         String
  description  String?
  image        String?
  order        Int      @default(0)
  isActive     Boolean  @default(true)
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  storefront Storefront          @relation(fields: [storefrontId], references: [id], onDelete: Cascade)
  parent     StorefrontCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children   StorefrontCategory[] @relation("CategoryHierarchy")
  products   StorefrontProduct[]

  @@unique([storefrontId, slug])
  @@index([storefrontId])
  @@index([parentId])
  @@index([isActive])
  @@map("StorefrontCategory")
}

model StorefrontSettings {
  id                   String   @id @default(auto()) @map("_id") @db.ObjectId
  storefrontId         String   @unique @db.ObjectId
  socialLinks          Json?    // { instagram, tiktok, youtube, facebook, etc. }
  bio                  String?
  showEarnings         Boolean  @default(false)
  autoAcceptProducts   Boolean  @default(false)
  minCommissionRate    Float?   // Minimum commission rate to accept
  metadata             Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  storefront Storefront @relation(fields: [storefrontId], references: [id], onDelete: Cascade)

  @@map("StorefrontSettings")
}
```

### 6. Product Service Schema
**File**: `product/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_PRODUCT")
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  DRAFT
  DELETED
}

enum ProductType {
  PHYSICAL
  DIGITAL
  SERVICE
}

model Product {
  id            String         @id @default(auto()) @map("_id") @db.ObjectId
  shopId        String         @db.ObjectId
  categoryId    String?       @db.ObjectId
  name          String
  slug          String
  description   String?
  sku           String         @unique
  basePrice     Float
  status        ProductStatus @default(DRAFT)
  type          ProductType   @default(PHYSICAL)
  weight        Float?
  dimensions    Json?
  metadata      Json?
  deletedAt     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  category      ProductCategory? @relation(fields: [categoryId], references: [id])
  variants      ProductVariant[]
  images        ProductImage[]

  @@index([shopId])
  @@index([categoryId])
  @@index([status])
  @@index([slug])
  @@map("Product")
}

model ProductCategory {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  parentId    String?  @db.ObjectId
  name        String
  slug        String   @unique
  description String?
  image       String?
  order       Int      @default(0)
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  parent   ProductCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children ProductCategory[] @relation("CategoryHierarchy")
  products Product[]

  @@index([parentId])
  @@index([slug])
  @@map("ProductCategory")
}

model ProductVariant {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  productId   String   @db.ObjectId
  name        String
  sku         String   @unique
  price       Float
  stock       Int      @default(0)
  attributes  Json?
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([sku])
  @@map("ProductVariant")
}

model ProductImage {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  productId String   @db.ObjectId
  url       String
  alt       String?
  order     Int      @default(0)
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@map("ProductImage")
}
```

### 7. Inventory Shop Service Schema
**File**: `inventory-shop/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_INVENTORY_SHOP")
}

enum InventoryMovementType {
  IN
  OUT
  RESERVED
  RELEASED
  RETURNED
  ADJUSTMENT
}

model InventoryShop {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  shopId          String   @db.ObjectId
  productId       String   @db.ObjectId
  variantId       String?  @db.ObjectId
  availableQty    Int      @default(0)
  reservedQty     Int      @default(0)
  totalQty        Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  movements InventoryMovement[]

  @@unique([shopId, productId, variantId])
  @@index([shopId])
  @@index([productId])
  @@map("InventoryShop")
}

model InventoryMovement {
  id          String                 @id @default(auto()) @map("_id") @db.ObjectId
  inventoryId String                 @db.ObjectId
  orderId     String?                @db.ObjectId
  type        InventoryMovementType
  quantity    Int
  reason      String?
  metadata    Json?
  createdAt   DateTime               @default(now())

  inventory InventoryShop @relation(fields: [inventoryId], references: [id], onDelete: Cascade)

  @@index([inventoryId])
  @@index([orderId])
  @@index([type])
  @@index([createdAt])
  @@map("InventoryMovement")
}
```

### 8. Cart Service Schema
**File**: `cart/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_CART")
}

model Cart {
  id        String     @id @default(auto()) @map("_id") @db.ObjectId
  userId    String     @unique @db.ObjectId
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  items CartItem[]

  @@map("Cart")
}

model CartItem {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  cartId      String   @db.ObjectId
  productId   String   @db.ObjectId
  variantId   String?  @db.ObjectId
  quantity    Int
  price       Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  cart Cart @relation(fields: [cartId], references: [id], onDelete: Cascade)

  @@unique([cartId, productId, variantId])
  @@index([cartId])
  @@index([productId])
  @@map("CartItem")
}
```

### 9. Order Service Schema
**File**: `order/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_ORDER")
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
  REFUNDED
}

enum OrderType {
  NORMAL
  RETURN
}

model Order {
  id                String            @id @default(auto()) @map("_id") @db.ObjectId
  orderNumber       String            @unique
  userId            String            @db.ObjectId
  shopId            String            @db.ObjectId
  status            OrderStatus       @default(PENDING_PAYMENT)
  type              OrderType         @default(NORMAL)
  subtotal          Float
  discount          Float             @default(0)
  shippingFee       Float             @default(0)
  total             Float
  paymentDeadline   DateTime?
  shippingAddress   Json
  metadata          Json?
  cancelledAt       DateTime?
  cancelledReason   String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  items     OrderItem[]
  histories OrderTracking[]

  @@index([userId])
  @@index([shopId])
  @@index([status])
  @@index([orderNumber])
  @@index([paymentDeadline])
  @@map("Order")
}

model OrderItem {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  orderId     String   @db.ObjectId
  productId   String   @db.ObjectId
  variantId   String?  @db.ObjectId
  productName String
  variantName String?
  quantity    Int
  price       Float
  discount    Float    @default(0)
  total       Float
  createdAt   DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([productId])
  @@map("OrderItem")
}

model OrderTracking {
  id          String      @id @default(auto()) @map("_id") @db.ObjectId
  orderId     String      @db.ObjectId
  status      OrderStatus
  reason      String?
  metadata    Json?
  createdAt   DateTime    @default(now())

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([status])
  @@index([createdAt])
  @@map("OrderTracking")
}
```

### 10. Payment Service Schema
**File**: `payment/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_PAYMENT")
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
  CANCELLED
  REFUNDED
}

enum PaymentMethodType {
  CASH_ON_DELIVERY
  BANK_TRANSFER
  E_WALLET
  CREDIT_CARD
  DEBIT_CARD
}

model Payment {
  id            String            @id @default(auto()) @map("_id") @db.ObjectId
  orderId       String            @unique @db.ObjectId
  methodId      String            @db.ObjectId
  amount        Float
  status        PaymentStatus     @default(PENDING)
  paidAt        DateTime?
  metadata      Json?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  method      PaymentMethod      @relation(fields: [methodId], references: [id])
  transactions PaymentTransaction[]

  @@index([orderId])
  @@index([status])
  @@map("Payment")
}

model PaymentMethod {
  id          String            @id @default(auto()) @map("_id") @db.ObjectId
  type        PaymentMethodType
  name        String
  description String?
  isActive    Boolean           @default(true)
  config      Json?
  metadata    Json?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  payments Payment[]

  @@index([type])
  @@map("PaymentMethod")
}

model PaymentTransaction {
  id            String          @id @default(auto()) @map("_id") @db.ObjectId
  paymentId     String          @db.ObjectId
  transactionId String?         @unique
  amount        Float
  status        PaymentStatus
  gateway       String?
  gatewayResponse Json?
  metadata      Json?
  createdAt     DateTime        @default(now())

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@index([transactionId])
  @@index([status])
  @@map("PaymentTransaction")
}
```

### 11. Promotion Service Schema
**File**: `promotion/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_PROMOTION")
}

enum PromotionType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}

enum PromotionStatus {
  ACTIVE
  INACTIVE
  EXPIRED
}

enum VoucherStatus {
  ACTIVE
  USED
  EXPIRED
  CANCELLED
}

model Promotion {
  id            String          @id @default(auto()) @map("_id") @db.ObjectId
  shopId        String?         @db.ObjectId
  name          String
  description   String?
  type          PromotionType
  value         Float
  minOrderValue Float?
  maxDiscount   Float?
  startDate     DateTime
  endDate       DateTime
  status        PromotionStatus @default(ACTIVE)
  usageLimit    Int?
  usedCount     Int             @default(0)
  metadata      Json?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([shopId])
  @@index([status])
  @@index([startDate, endDate])
  @@map("Promotion")
}

model Voucher {
  id            String        @id @default(auto()) @map("_id") @db.ObjectId
  code          String        @unique
  name          String
  description   String?
  type          PromotionType
  value         Float
  minOrderValue Float?
  maxDiscount   Float?
  startDate     DateTime
  endDate       DateTime
  status        VoucherStatus @default(ACTIVE)
  usageLimit    Int?
  usedCount     Int           @default(0)
  userId        String?       @db.ObjectId
  metadata      Json?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([code])
  @@index([status])
  @@index([userId])
  @@index([startDate, endDate])
  @@map("Voucher")
}

model Campaign {
  id          String          @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String?
  startDate   DateTime
  endDate     DateTime
  status      PromotionStatus @default(ACTIVE)
  metadata    Json?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([status])
  @@index([startDate, endDate])
  @@map("Campaign")
}

model FlashSale {
  id          String          @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String?
  startTime   DateTime
  endTime     DateTime
  status      PromotionStatus @default(ACTIVE)
  metadata    Json?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([status])
  @@index([startTime, endTime])
  @@map("FlashSale")
}
```

### 12. Warehouse Service Schema
**File**: `warehouse/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_WAREHOUSE")
}

enum WarehouseType {
  HUB
  DISTRIBUTION_CENTER
  FULFILLMENT_CENTER
}

enum WarehouseStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

model Warehouse {
  id          String            @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  code        String            @unique
  type        WarehouseType
  status      WarehouseStatus   @default(ACTIVE)
  address     String
  province    String
  district    String?
  ward        String?
  postalCode  String?
  latitude    Float?
  longitude   Float?
  capacity    Json?
  metadata    Json?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  locations WarehouseLocation[]

  @@index([code])
  @@index([status])
  @@index([province])
  @@map("Warehouse")
}

model WarehouseLocation {
  id          String     @id @default(auto()) @map("_id") @db.ObjectId
  warehouseId String     @db.ObjectId
  code        String
  name        String
  zone        String?
  aisle       String?
  shelf       String?
  metadata    Json?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  @@unique([warehouseId, code])
  @@index([warehouseId])
  @@map("WarehouseLocation")
}
```

### 13. Inventory Warehouse Service Schema
**File**: `inventory-warehouse/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_INVENTORY_WAREHOUSE")
}

enum WarehouseMovementType {
  IN
  OUT
  TRANSFER
  ADJUSTMENT
  RETURN
}

model InventoryWarehouse {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  warehouseId     String   @db.ObjectId
  locationId      String?  @db.ObjectId
  productId       String   @db.ObjectId
  variantId       String?  @db.ObjectId
  availableQty    Int      @default(0)
  reservedQty     Int      @default(0)
  totalQty        Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  movements WarehouseMovement[]

  @@unique([warehouseId, locationId, productId, variantId])
  @@index([warehouseId])
  @@index([productId])
  @@map("InventoryWarehouse")
}

model WarehouseMovement {
  id              String                 @id @default(auto()) @map("_id") @db.ObjectId
  inventoryId     String                 @db.ObjectId
  orderId         String?                @db.ObjectId
  shippingId      String?                @db.ObjectId
  fromWarehouseId String?                @db.ObjectId
  toWarehouseId   String?                @db.ObjectId
  type            WarehouseMovementType
  quantity        Int
  reason          String?
  metadata        Json?
  createdAt       DateTime               @default(now())

  inventory InventoryWarehouse @relation(fields: [inventoryId], references: [id], onDelete: Cascade)

  @@index([inventoryId])
  @@index([orderId])
  @@index([shippingId])
  @@index([type])
  @@index([createdAt])
  @@map("WarehouseMovement")
}
```

### 14. Shipping Service Schema
**File**: `shipping/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL_SHIPPING")
}

enum ShippingStatus {
  PENDING
  PICKED_UP
  IN_TRANSIT
  AT_WAREHOUSE
  OUT_FOR_DELIVERY
  DELIVERED
  RETURNED
  CANCELLED
}

enum ShippingType {
  OUTBOUND
  RETURN
}

model Shipping {
  id              String         @id @default(auto()) @map("_id") @db.ObjectId
  orderId         String         @unique @db.ObjectId
  methodId        String         @db.ObjectId
  type            ShippingType   @default(OUTBOUND)
  trackingNumber  String         @unique
  status          ShippingStatus @default(PENDING)
  fromAddress     Json
  toAddress       Json
  route           Json?
  estimatedDays   Int?
  actualDays      Int?
  weight          Float?
  fee             Float
  metadata        Json?
  pickedUpAt      DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  method    ShippingMethod    @relation(fields: [methodId], references: [id])
  trackings ShippingTracking[]

  @@index([orderId])
  @@index([trackingNumber])
  @@index([status])
  @@map("Shipping")
}

model ShippingMethod {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  code        String   @unique
  description String?
  isActive    Boolean  @default(true)
  baseFee     Float
  feePerKg    Float?
  estimatedDays Int?
  config      Json?
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  shippings Shipping[]

  @@index([code])
  @@map("ShippingMethod")
}

model ShippingTracking {
  id          String         @id @default(auto()) @map("_id") @db.ObjectId
  shippingId  String         @db.ObjectId
  warehouseId String?        @db.ObjectId
  status      ShippingStatus
  location    String?
  note        String?
  metadata    Json?
  createdAt   DateTime       @default(now())

  shipping Shipping @relation(fields: [shippingId], references: [id], onDelete: Cascade)

  @@index([shippingId])
  @@index([status])
  @@index([createdAt])
  @@map("ShippingTracking")
}
```

## Summary

### Total Collections: 39
- **Identity Service**: 2 collections
- **User Service**: 3 collections
- **Shop Service**: 4 collections (Seller only)
- **Storefront Service**: 4 collections (KOL affiliate)
- **Product Service**: 4 collections
- **Inventory Shop Service**: 2 collections
- **Cart Service**: 2 collections
- **Order Service**: 3 collections
- **Payment Service**: 3 collections
- **Promotion Service**: 4 collections
- **Warehouse Service**: 2 collections
- **Inventory Warehouse Service**: 2 collections
- **Shipping Service**: 3 collections

### Key Features
- Multi-role support (USER/SELLER/KOL/ADMIN)
- 1 Seller = 1 Shop (sell own products)
- 1 KOL = 1 Storefront (sell affiliate products from various shops)
- Inventory management at shop and warehouse levels
- Order flow with 30min payment timeout
- Return flow support
- Shipping tracking through multiple warehouses
- Comprehensive promotion system
- Affiliate commission tracking for KOLs

