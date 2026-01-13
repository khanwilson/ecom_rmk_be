# Shop Service - Implementation Plan

**Created**: 2026-01-13
**Status**: ✅ Completed
**Purpose**: Shop management for **Sellers only** (KOL uses Storefront Service)

---

## Quick Status

| Part | Description | Status |
|------|-------------|--------|
| Part 1 | Create service framework | ✅ Completed |
| Part 2 | Create APIs | ✅ Completed |
| Part 3 | Inter-service connections | ✅ Completed |
| Part 4 | Additional items | ✅ Completed |

---

## Part 1: Create Service Framework ✅

### 1.1 Prerequisites
     
| Item | Status |
|------|--------|
| Service defined in `site-map.md` | ✅ |
| `SHOP_PORT=3004` in `.env` | ⬜ (User needs to add) |
| `DATABASE_URL_SHOP` in `.env` | ⬜ (User needs to add) |

### 1.2 Files Checklist

| File | Status |
|------|--------|
| `prisma/schema.prisma` | ✅ |
| `package.json` | ✅ |
| `tsconfig.json` | ✅ |
| `tsconfig.build.json` | ✅ |
| `nest-cli.json` | ✅ |
| `Dockerfile.dev` | ✅ |
| `docker-entrypoint.sh` | ✅ |
| `eslint.config.mjs` | ✅ |
| `.dockerignore` | ✅ |
| `.gitignore` | ✅ |
| `.prettierrc` | ✅ |
| `prisma/prisma.ts` | ✅ |
| `prisma/prisma.config.ts` | ✅ |
| `src/main.ts` | ✅ |
| `src/shop.module.ts` | ✅ |
| `src/shop.service.ts` | ✅ |
| `src/shop.controller.ts` | ✅ |
| `kafka/kafka.controller.ts` | ✅ |
| `kafka/kafka.service.ts` | ✅ |

### 1.3 Shared Libraries Updates

| Item | Status |
|------|--------|
| Added `SHOP_SERVICE` to `KAFKA_SERVICES` enum | ✅ |

### 1.4 Infrastructure Updates

| Item | Status |
|------|--------|
| Add to `docker-compose.dev.yml` | ✅ |
| Update root `package.json` scripts | ✅ |

---

## Part 2: Create APIs ✅

### 2.1 API Planning

| # | Method | Endpoint | Description | Auth | Status |
|---|--------|----------|-------------|------|--------|
| **Shop Management** |
| 1 | POST | `/shop/register` | Register as Seller (create shop) | ✅ JWT | ✅ |
| 2 | GET | `/shop/my-shop` | Get current user's shop | ✅ JWT | ✅ |
| 3 | PATCH | `/shop/my-shop` | Update current user's shop | ✅ JWT | ✅ |
| 4 | GET | `/shop/:slug` | Get shop by slug (public) | ❌ No | ✅ |
| **Shop Category Management** |
| 5 | POST | `/shop/categories` | Create category | ✅ JWT | ✅ |
| 6 | GET | `/shop/categories` | List all categories of my shop | ✅ JWT | ✅ |
| 7 | GET | `/shop/categories/:id` | Get category by ID | ✅ JWT | ✅ |
| 8 | PATCH | `/shop/categories/:id` | Update category | ✅ JWT | ✅ |
| 9 | DELETE | `/shop/categories/:id` | Delete category | ✅ JWT | ✅ |
| 10 | PATCH | `/shop/categories/:id/reorder` | Reorder category | ✅ JWT | ✅ |
| **Shop Settings Management** |
| 11 | GET | `/shop/settings` | Get shop settings | ✅ JWT | ✅ |
| 12 | PATCH | `/shop/settings` | Update shop settings | ✅ JWT | ✅ |
| **Shop Verification Management** |
| 13 | GET | `/shop/verification` | Get verification status | ✅ JWT | ✅ |
| 14 | POST | `/shop/verification/submit` | Submit verification documents | ✅ JWT | ✅ |

### 2.2 DTOs

| DTO File | Location | Status |
|----------|----------|--------|
| `register-shop.dto.ts` | `modules/shop/dto/` | ✅ |
| `update-shop.dto.ts` | `modules/shop/dto/` | ✅ |
| `create-category.dto.ts` | `modules/shop/dto/` | ✅ |
| `update-category.dto.ts` | `modules/shop/dto/` | ✅ |
| `reorder-category.dto.ts` | `modules/shop/dto/` | ✅ |
| `update-settings.dto.ts` | `modules/shop/dto/` | ✅ |
| `submit-verification.dto.ts` | `modules/shop/dto/` | ✅ |
| `index.ts` (barrel export) | `modules/shop/dto/` | ✅ |

### 2.3 Service Methods

| Method | Description | Status |
|--------|-------------|--------|
| **Shop** |
| `registerShop()` | Register user as Seller, create shop | ✅ |
| `getMyShop()` | Get current user's shop | ✅ |
| `updateMyShop()` | Update current user's shop | ✅ |
| `getShopBySlug()` | Get shop by slug (public) | ✅ |
| **Category** |
| `createCategory()` | Create new category | ✅ |
| `getCategories()` | List all categories | ✅ |
| `getCategory()` | Get single category | ✅ |
| `updateCategory()` | Update category | ✅ |
| `deleteCategory()` | Delete category | ✅ |
| `reorderCategory()` | Reorder category | ✅ |
| **Settings** |
| `getSettings()` | Get shop settings | ✅ |
| `updateSettings()` | Update shop settings | ✅ |
| **Verification** |
| `getVerification()` | Get verification status | ✅ |
| `submitVerification()` | Submit verification documents | ✅ |

---

## Part 3: Inter-Service Connections ✅

### 3.1 Redis Integration

| Feature | Description | Status |
|---------|-------------|--------|
| Shop cache | Cache shop info by slug | ⬜ Future enhancement |
| Category cache | Cache categories by shopId | ⬜ Future enhancement |

### 3.2 Kafka Integration

| Topic | Event Type | Direction | Description | Status |
|-------|------------|-----------|-------------|--------|
| `ecom.shop.created` | Event | Producer | Emit when shop is created | ✅ |
| `ecom.shop.updated` | Event | Producer | Emit when shop is updated | ✅ |
| `ecom.shop.verified` | Event | Producer | Emit when shop is verified (by admin) | ✅ (Topic added) |

### 3.3 Service Dependencies

| Service | Communication | Purpose | Status |
|---------|---------------|---------|--------|
| Identity Service | Kafka | Update user roles (add SELLER) | ✅ Event emitted |

**Note**: Khi user đăng ký Seller, shop service emit `ecom.shop.created` event. Identity Service cần listen event này để cập nhật roles của user.

---

## Part 4: Additional Items ✅

### 4.1 Libs Updates

| File | Change Description | Status |
|------|-------------------|--------|
| `libs/kafka/constant/kafka.enum.ts` | Added SHOP_CREATED, SHOP_UPDATED, SHOP_VERIFIED topics | ✅ |

### 4.2 Helper Functions

| Function | Description | Status |
|----------|-------------|--------|
| `slugify()` | Convert string to URL-friendly slug | ✅ (in ShopService) |
| `generateUniqueSlug()` | Generate unique shop slug | ✅ (in ShopService) |
| `generateUniqueCategorySlug()` | Generate unique category slug within shop | ✅ (in ShopService) |

### 4.3 Validation

| Item | Description | Status |
|------|-------------|--------|
| Check user already has shop | Prevent duplicate shop creation | ✅ |
| Validate category hierarchy | Prevent circular references | ✅ |
| Validate parent category | Ensure parent belongs to same shop | ✅ |

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| 2026-01-13 | AI | Initial creation - Part 1 completed |
| 2026-01-13 | AI | Part 2-4 planning added |
| 2026-01-13 | AI | Removed KOL-related APIs (Shop is Seller-only, KOL uses Storefront) |
| 2026-01-13 | AI | Part 1.4 completed (docker-compose, package.json) |
| 2026-01-13 | AI | Part 2 completed (DTOs, Service, Controller - 14 endpoints) |
| 2026-01-13 | AI | Part 3 completed (Kafka topics, event emission) |
| 2026-01-13 | AI | Part 4 completed (helper functions, validation) |

---

## Pending Decisions (Resolved)

1. **Role Update Flow**: ✅ Resolved
   - Shop service emits `ecom.shop.created` event
   - Identity service should listen and add SELLER role

2. **Slug Generation**: ✅ Resolved
   - Shop slug: Unique globally
   - Category slug: Unique within shop (per shopId)

3. **Category Depth**: ⬜ Open
   - Currently: No depth limit (unlimited nesting)
   - Consider adding depth limit if needed

---

## Next Steps (For User)

1. ✅ All code implementation completed
2. ⬜ Add environment variables to `.env`:
   ```
   SHOP_PORT=3004
   DATABASE_URL_SHOP=mongodb://mongodb-primary:27017/ecom_shop?replicaSet=rs0&directConnection=true
   ```
3. ⬜ Run `bunx prisma generate` in shop directory to generate Prisma client
4. ⬜ Rebuild libs package: `cd libs && bun run build && bun pm pack`
5. ⬜ Start services: `docker-compose -f docker-compose.dev.yml up -d shop-service`
6. ⬜ Identity service: Add listener for `ecom.shop.created` to update SELLER role
7. ⬜ Test APIs via Swagger: `http://localhost:3004/api`
