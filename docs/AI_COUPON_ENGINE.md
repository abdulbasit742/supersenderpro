# AI Coupon / Discount Code Engine

Deterministic coupon validation + redemption for SuperSender Pro. The core math runs with **no model**; Ollama only phrases a friendly promo line (with template fallback if unreachable). Zero new npm deps, `server.js` untouched, fully tenant-scoped.

## Files
- `lib/couponEngine/couponEngine.js` - engine (create/validate/redeem/list/deactivate + AI phrasing)
- `routes/couponRoutes.js` - self-mountable Express router
- `tests/smoke/couponSmoke.js` - offline smoke test

## Mounting
```js
const couponRoutes = require('./routes/couponRoutes');
couponRoutes.mount(app); // -> /api/coupons
// or
app.use('/api/coupons', require('./routes/couponRoutes').router());
```
Tenant is resolved from `req.tenantId`, header `x-tenant-id`, body `tenantId`, or query `tenantId`. Missing tenant throws.

## Coupon model
| field | meaning |
|---|---|
| `code` | normalized to UPPERCASE |
| `type` | `percent` or `fixed` |
| `value` | percent (<=100) or fixed amount |
| `minOrder` | minimum order total to qualify |
| `maxUses` | global redemption cap (null = unlimited) |
| `perCustomer` | per-customer redemption cap (null = unlimited) |
| `startsAt` / `expiresAt` | ISO date window |
| `active` | toggle |
| `currency` | default `PKR` |

## API
- `POST /api/coupons` - create/upsert `{ code, type, value, minOrder, maxUses, perCustomer, startsAt, expiresAt, currency }`
- `GET /api/coupons` - list
- `GET /api/coupons/:code` - fetch one
- `POST /api/coupons/:code/validate` - `{ orderTotal, customerId, at }` -> `{ ok, reason, discount, finalTotal }`
- `POST /api/coupons/:code/redeem` - same body, commits a use
- `POST /api/coupons/:code/offer-message` - `{ lang, timeoutMs }` -> AI/template promo line
- `DELETE /api/coupons/:code` - deactivate

## Validation reasons
`not_found`, `inactive`, `not_started`, `expired`, `max_uses_reached`, `per_customer_limit`, `invalid_order_total`, `below_min_order`, `valid`.

## Storage
File-backed at `data/coupons/<tenantId>.json`. Per-tenant isolation; one tenant never sees another's codes.

## Test
```bash
node tests/smoke/couponSmoke.js
```
Forces `OLLAMA_HOST` unreachable, asserts discount math, min-order, expiry, max-uses, per-customer limits, discount cap, tenant isolation, and AI template fallback.
