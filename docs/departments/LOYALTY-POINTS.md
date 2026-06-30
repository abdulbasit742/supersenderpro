# #71 Loyalty & Points Program

Self-contained loyalty department. Awards points on paid orders, tracks per-contact balances + a full transaction ledger, applies tiers (Bronze/Silver/Gold/Platinum) with earn multipliers, and supports redemption (points → discount value, optionally minted as a coupon via the Coupons dept #59).

## Design
- **JSON-backed**: `data/loyalty.json` (`{ accounts, ledger }`). No DB, no new deps.
- **Tenant-scoped**: every account + ledger entry carries `tenantId`; missing → `default`.
- **PII-masked**: contact IDs masked in all API responses/exports.
- **Advisory-safe**: no outbound messages, no charges. Redemption returns value or an optional coupon; nothing is sent.

## Modules (`lib/loyalty/`)
| File | Role |
|---|---|
| `config.js` | Env-driven settings (earn rate, point value, redeem cap, expiry, tiers) |
| `store.js` | JSON load/save, account + ledger accessors |
| `privacy.js` | Contact-ID masking for views |
| `pointsEngine.js` | `earn` / `redeem` / `adjust` + ledger writes |
| `tierEngine.js` | Tier resolution by lifetime earned, `nextTier` progress |
| `redemption.js` | `quote` (value, capped) + optional `toCoupon` (#59 bridge) |
| `doctor.js` | Self-diagnostic |
| `index.js` | Barrel + high-level helpers + `onOrderPaid` hook |

## Config (env)
| Var | Default | Meaning |
|---|---|---|
| `LOYALTY_ENABLED` | `true` | Master switch |
| `LOYALTY_POINTS_PER_CURRENCY` | `1` | Points earned per 1 currency spent |
| `LOYALTY_MIN_ORDER_TO_EARN` | `0` | Min order value to earn |
| `LOYALTY_POINT_VALUE` | `0.01` | Currency value of 1 point on redeem |
| `LOYALTY_MAX_REDEEM_RATIO` | `0.5` | Max share of an order payable in points |
| `LOYALTY_EXPIRY_DAYS` | `0` | Point expiry (0 = never) |

## API (`/api/loyalty`)
- `GET /health` — doctor
- `GET /balance/:contactId` — balance, tier, next-tier progress
- `GET /accounts?limit=` — leaderboard (masked)
- `GET /ledger/:contactId` — transaction history (masked)
- `POST /earn` — `{ contactId, amount, orderId?, reason? }`
- `POST /redeem/quote` — `{ points, orderTotal? }` → value (capped)
- `POST /redeem` — `{ contactId, points, orderId?, orderTotal? }`
- `POST /adjust` — `{ contactId, points, reason? }` (admin grant/clawback)

## Wiring (server.js, 2-3 lines — not auto-applied)
```js
app.use('/api/loyalty', require('./routes/loyaltyRoutes'));
// On order paid (order mgmt #63 / webhook #51):
// require('./lib/loyalty').onOrderPaid({ tenantId, contactId, amount, orderId });
```

## Cross-dept (all optional, degrade gracefully)
- **Coupons #59**: redemption can mint a single-use coupon for the discount value.
- **Order Management #63 / Webhook Ingestion #51**: fire `onOrderPaid` to auto-award.
- **Customer 360 #46**: balances/tier surface on the contact profile if wired.

## Verify
```
npm run loyalty:check
npm run loyalty:smoke
```
