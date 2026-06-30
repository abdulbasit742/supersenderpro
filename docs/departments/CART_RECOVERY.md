# Cart & Abandoned-Cart Recovery (Feature #72)

Detects abandoned carts and **drafts** a tiered sequence of recovery nudges. Dry-run by default — nothing sends until you flip a switch and wire a notifier.

## Why
Closes the loop between checkout and a lost sale. Pairs with Orders (#63), Inventory (#66) and Coupons (#59): an abandoned cart can auto-attach a single-use incentive coupon on the final nudge.

## Files
- `lib/cartRecovery/` — config, store (JSON atomic), privacy (PII mask), engine, doctor, index barrel
- `routes/cartRecoveryRoutes.js` — REST API
- `scripts/cart-recovery-check.js` — `npm run cart:check`
- `tests/smoke/cartRecoverySmoke.js` — `npm run cart:smoke`

## Wiring (server.js — 2 lines)
```js
const cartRecoveryRoutes = require('./routes/cartRecoveryRoutes');
app.use('/api/cart-recovery', cartRecoveryRoutes);
```
Run the recovery sweep on a schedule (e.g. node-cron, already a dependency):
```js
require('node-cron').schedule('*/15 * * * *', () => require('./lib/cartRecovery').tick());
```

## Lifecycle
`active` → (idle ≥ CART_ABANDON_MINUTES) → `abandoned` → nudge ladder → `converted` (order placed) or `lost` (CART_EXPIRE_MINUTES).

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/cart-recovery/health` | doctor report |
| GET | `/api/cart-recovery/carts?status=` | list carts (PII masked) |
| POST | `/api/cart-recovery/carts` | upsert a cart snapshot |
| POST | `/api/cart-recovery/carts/:cartId/converted` | mark recovered |
| POST | `/api/cart-recovery/tick` | run the sweep (draft due nudges) |
| GET | `/api/cart-recovery/nudges?status=` | list drafted/queued nudges |
| GET | `/api/cart-recovery/stats` | recovered vs abandoned value |

Tenant via `x-tenant-id` header (or `tenantId` in body/query). Missing tenant throws.

## Safety
- **DRY-RUN default**: nudges are `draft` only. Set `CART_RECOVERY_LIVE=true` to queue them through the alert/notifier (Alerts dept #28) — still no raw auto-send wired here.
- **Quiet hours** (`CART_QUIET_START`/`END`, default 22:00–08:00): due nudges wait.
- **PII masked** in all listings.
- **Caps**: `CART_MAX_NUDGES` (default 3) hard-limits nudges per cart.
- 100% additive: no existing module, route, or data file touched. No new npm dependency.

## Env
| Var | Default | Meaning |
|---|---|---|
| `CART_RECOVERY_LIVE` | `false` | queue nudges to notifier vs draft-only |
| `CART_ABANDON_MINUTES` | `60` | idle before abandoned |
| `CART_NUDGE_STEPS` | `60,1440,4320` | minutes-after-abandon ladder |
| `CART_MAX_NUDGES` | `3` | hard cap per cart |
| `CART_QUIET_START` / `CART_QUIET_END` | `22` / `8` | quiet window |
| `CART_INCENTIVE_FINAL` | `true` | coupon on last nudge |
| `CART_EXPIRE_MINUTES` | `10080` | mark lost after |
| `CART_CURRENCY` | `PKR` | display currency |
