# Feature #59 — Coupons & Discount Codes

Create discount codes (percentage, fixed amount, free shipping), validate them at checkout, and
redeem them with usage limits and an auditable ledger. The promo layer that drives campaigns
(#6 drip / broadcast) and plugs into payments (#1).

## Why
Marketing needs codes: 'EID20' for 20% off, single-use giveaway codes, 'first order' discounts.
The product could send campaigns but had no way to issue or honor a discount, or stop a code from
being abused. This adds proper coupons with min-spend, caps, validity windows, and redemption
tracking.

## What it does
- **Create codes:** `create({ code?, type, value, minSpend?, maxRedemptions?, perContactLimit?, startsAt?, expiresAt? })`.
  Types: `percent` (0-100), `fixed` (capped at the order amount), `free_shipping`. Auto-generates
  a readable code if none given (optional prefix, e.g. `EID-7QK2M9`).
- **Validate (no redeem):** `validate({ code, amount, contact })` → `{ ok, discount, finalAmount,
  freeShipping }` or a reason (unknown / inactive / not yet valid / expired / min-spend / global
  cap / per-customer cap). Codes are **case-insensitive**.
- **Redeem (records):** `redeem({ code, amount, contact, orderId })` validates atomically, records
  a ledger entry, and bumps the count. **Idempotent per code+orderId** so a retried checkout never
  double-counts.
- **Caps:** global `maxRedemptions` + `perContactLimit` (counted from the ledger).
- **Bulk generate:** N unique single-use codes sharing one discount config (giveaways).
- **Ledger + stats:** per-code redemptions, unique contacts, total discount, remaining.

## Files
- `lib/coupons/config.js` — env posture (currency, code length, bulk cap)
- `lib/coupons/store.js` — atomic JSON store (`data/coupons.json`)
- `lib/coupons/privacy.js` — contact masking
- `lib/coupons/codeGen.js` — readable unambiguous codes (+ prefix)
- `lib/coupons/couponStore.js` — coupon CRUD + bulk generate
- `lib/coupons/validator.js` — validate + discount computation (read-only)
- `lib/coupons/redemption.js` — atomic redeem + idempotency + ledger + stats
- `lib/coupons/doctor.js` — offline self-check + posture
- `lib/coupons/index.js` — barrel
- `routes/couponsRoutes.js` — REST surface (`/api/coupons`)
- `scripts/coupons-check.js`, `tests/smoke/couponsSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const couponsRoutes = require('./routes/couponsRoutes');
app.use('/api/coupons', couponsRoutes);
```
At checkout (with payments #1): validate to show the price, then redeem on successful order.
```js
const cp = require('./lib/coupons');
const v = cp.validate({ code, amount: cartTotal, contact });   // preview the discount
if (v.ok) { /* charge v.finalAmount */ cp.redeem({ code, amount: cartTotal, contact, orderId }); }
```
Redemptions emit a customer-360 #46 event + a `coupon.redeemed` analytics #9 event automatically.

## Endpoints (`/api/coupons`)
- `GET /status`, `GET /doctor`
- `POST /coupons` `{ code?, type, value, minSpend?, maxRedemptions?, perContactLimit?, startsAt?, expiresAt? }`
- `GET /coupons`, `GET /coupons/:code` (+stats), `POST /coupons/:id/active`, `POST /coupons/bulk` `{ count, options }`
- `POST /validate` `{ code, amount, contact }`, `POST /redeem` `{ code, amount, contact, orderId? }`
- `GET /ledger` (`?code=&contact=`)

## Safety
JSON-backed; **validates + records redemptions only — never charges or sends**. Idempotent
redemption per code+orderId. Fixed discount capped at the order amount; percent capped at 100.
Caps enforced from the ledger. Contacts masked in views. Coupons deactivated, never hard-deleted.
100% additive; no existing module/route/data changed, no new dependency (node crypto).

## Env
```
COUPONS_ENABLED=true
COUPONS_DEFAULT_CURRENCY=PKR
COUPONS_CODE_LENGTH=8
COUPONS_MAX_BULK=1000
```

## Verify
```bash
for f in lib/coupons/*.js; do node --check "$f"; done
node --check routes/couponsRoutes.js
npm run coupons:check
npm run coupons:smoke
```

Feature #59 done. Agle number ka intezaar.
