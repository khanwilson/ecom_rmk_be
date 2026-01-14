# Identity Service - Role Registration Enhancement Plan

**Created**: 2026-01-14
**Status**: ✅ Completed
**Purpose**: Add SELLER and KOL role registration APIs

---

## Quick Status

| Part | Description | Status |
|------|-------------|--------|
| Part 1 | Add Kafka topics | ✅ Completed |
| Part 2 | Create DTOs | ✅ Completed |
| Part 3 | Add service methods | ✅ Completed |
| Part 4 | Add controller endpoints | ✅ Completed |

---

## Business Logic

### SELLER Registration Flow
1. User must be logged in (have JWT)
2. User calls `POST /auth/register-seller` with shop info
3. Identity service adds `SELLER` role to Identity
4. Identity service emits `IDENTITY_SELLER_REGISTERED` event via Kafka
5. Shop service listens and creates Shop for this user

### KOL Registration Flow
1. User must be logged in (have JWT)
2. User calls `POST /auth/register-kol` with storefront info
3. Identity service adds `KOL` role to Identity
4. Identity service emits `IDENTITY_KOL_REGISTERED` event via Kafka
5. **TODO**: Storefront service (not yet created) will listen and create Storefront

---

## Part 1: Add Kafka Topics ✅

| File | Change | Status |
|------|--------|--------|
| `libs/kafka/constant/kafka.enum.ts` | Add `IDENTITY_SELLER_REGISTERED`, `IDENTITY_KOL_REGISTERED` | ✅ |

---

## Part 2: Create DTOs ✅

| DTO File | Location | Description | Status |
|----------|----------|-------------|--------|
| `register-seller.dto.ts` | `modules/auth/dto/` | Shop info (name, description, logo) | ✅ |
| `register-kol.dto.ts` | `modules/auth/dto/` | Storefront info (name, description, logo) | ✅ |

---

## Part 3: Add Service Methods ✅

| Method | Description | Status |
|--------|-------------|--------|
| `registerSeller()` | Add SELLER role, emit Kafka event | ✅ |
| `registerKol()` | Add KOL role, emit Kafka event | ✅ |

---

## Part 4: Add Controller Endpoints ✅

| Method | Endpoint | Description | Auth | Status |
|--------|----------|-------------|------|--------|
| POST | `/auth/register-seller` | Register as Seller | ✅ JWT | ✅ |
| POST | `/auth/register-kol` | Register as KOL | ✅ JWT | ✅ |

---

## Kafka Event Payloads

### IDENTITY_SELLER_REGISTERED
```json
{
  "identityId": "string",
  "email": "string",
  "phoneNumber": "string",
  "shop": {
    "name": "string",
    "description": "string",
    "logo": "string"
  }
}
```

### IDENTITY_KOL_REGISTERED
```json
{
  "identityId": "string",
  "email": "string",
  "phoneNumber": "string",
  "storefront": {
    "name": "string",
    "description": "string",
    "logo": "string"
  }
}
```

---

## Shop Service: Kafka Listener ✅

Shop service now listens for `IDENTITY_SELLER_REGISTERED` event and creates shop:

- `shop/kafka/kafka.controller.ts` - EventPattern handler
- `shop/kafka/kafka.service.ts` - Event processing logic
- `shop/src/shop.service.ts` - `createShopFromEvent()` method added

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| 2026-01-14 | AI | Initial plan created |
| 2026-01-14 | AI | All parts implemented |
| 2026-01-14 | AI | Shop service Kafka listener added |

---

## Implementation Summary

### Identity Service Changes:
1. **DTOs**: `register-seller.dto.ts`, `register-kol.dto.ts`
2. **Service**: `registerSeller()`, `registerKol()` methods in `auth.service.ts`
3. **Controller**: `/auth/register-seller`, `/auth/register-kol` endpoints
4. **Module**: Kafka ClientsModule added to `auth.module.ts`

### Shop Service Changes:
1. **Kafka Controller**: Listens for `IDENTITY_SELLER_REGISTERED`
2. **Kafka Service**: Processes event and calls `createShopFromEvent()`
3. **Shop Service**: New `createShopFromEvent()` method

### Libs Changes:
1. **kafka.enum.ts**: Added `IDENTITY_SELLER_REGISTERED`, `IDENTITY_KOL_REGISTERED`

---

## Next Steps (For User)

1. ✅ All implementation completed
2. ⬜ Rebuild libs: `cd libs && bun run build && bun pm pack`
3. ⬜ Restart Identity service: `docker-compose -f docker-compose.dev.yml restart identity-service`
4. ⬜ Restart Shop service: `docker-compose -f docker-compose.dev.yml restart shop-service`
5. ⬜ Test APIs via Swagger:
   - Login first to get JWT token
   - `POST /auth/register-seller` with shop info
   - Check shop created in Shop service
6. ⬜ When Storefront service is created, implement listener for `IDENTITY_KOL_REGISTERED`
