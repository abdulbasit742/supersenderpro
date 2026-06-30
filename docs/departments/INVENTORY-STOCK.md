# Feature #66 — Inventory & Stock

Track what's in stock and stop overselling. Products carry an **available / reserved** split: an
order reserves stock at checkout, commits it on fulfillment (decrementing on-hand), or releases it
on cancel. Restock, adjust, low-stock alerts, and a full movement ledger included.

## Why
Orders (#63) sell things and the legacy app had a `stockMutex`, but there was no first-class
inventory: no available-vs-reserved, no clean reserve/commit/release, no low-stock signal. Selling
stock you don't have is the fastest way to wreck trust. This adds proper, oversell-safe inventory.

## What it does
- **Products:** `upsert({ sku, name, onHand, lowStockThreshold })`. `available = onHand - reserved`.
  SKUs are unique + upper-cased.
- **Reserve → commit / release (the anti-oversell flow):**
  - `reserve({ sku, qty, orderId })` holds stock (available drops; on-hand unchanged). Rejected if
    available can't cover it (unless `INVENTORY_ALLOW_OVERSELL=true`). **Atomic** over a single
    read/write so concurrent reserves can't oversell.
  - `commit(reservationId)` on fulfillment: decrements on-hand + clears the reservation.
  - `release(reservationId)` on cancel: returns the reserved stock to available.
  - `reserveOrder(orderId, items)` reserves all of an order's lines, **rolling back** partial
    reservations if any line can't be filled.
- **restock / adjust:** add stock (purchase) or correct it (shrinkage); negative adjust allowed.
- **Low / out-of-stock:** detected on every product; **crossings** (dropping to/below threshold,
  or to 0) emit `stock.low` / `stock.out` into alerts #28.
- **Ledger:** every movement (reserve/commit/release/restock/adjust) recorded with before/after
  available, for a full audit trail.

## Files
- `lib/inventory/config.js` — env posture (threshold, oversell, alert fan-out)
- `lib/inventory/store.js` — atomic JSON store (`data/inventory.json`)
- `lib/inventory/productStore.js` — products + available/reserved view
- `lib/inventory/ledger.js` — auditable movement log
- `lib/inventory/stockEngine.js` — reserve/commit/release/restock/adjust/reserveOrder (atomic)
- `lib/inventory/doctor.js` — offline self-check + posture
- `lib/inventory/index.js` — barrel
- `routes/inventoryRoutes.js` — REST surface (`/api/inventory`)
- `scripts/inventory-check.js`, `tests/smoke/inventorySmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const inventoryRoutes = require('./routes/inventoryRoutes');
app.use('/api/inventory', inventoryRoutes);
```
Tie it to orders (#63) so stock follows the order lifecycle:
```js
const iv = require('./lib/inventory');
// on order place: reserve every line (rolls back if any line is short)
const r = await iv.stockEngine.reserveOrder(order.id, order.lines);
// on fulfill: commit each reservation;  on cancel: release each reservation
```
Low/out-of-stock crossings raise alerts via #28 automatically (e.g. ping the owner to restock).

## Endpoints (`/api/inventory`)
- `GET /status`, `GET /doctor`, `GET /overview`, `GET /low-stock`
- `POST /products`, `GET /products`, `GET /products/:sku` (+ledger)
- `POST /restock` `{ sku, qty, note }`, `POST /adjust` `{ sku, delta, note }`
- `POST /reserve` `{ sku, qty, orderId }`, `POST /reserve-order` `{ orderId, items }`
- `POST /commit` `{ reservationId }`, `POST /release` `{ reservationId }`
- `GET /ledger` (`?sku=&limit=`)

## Safety
JSON-backed; **all stock ops atomic** over a single read/write so concurrent reserves can't
oversell (hard stop at 0 unless explicitly allowed). This module never sends. Products deactivated,
never hard-deleted. Full movement ledger for audit. 100% additive; no existing module/route/data
changed, no new dependency.

## Env
```
INVENTORY_ENABLED=true
INVENTORY_LOW_STOCK_THRESHOLD=5
INVENTORY_ALLOW_OVERSELL=false                # true => allow reserving beyond available (not recommended)
INVENTORY_FAN_ALERTS=true                      # emit stock.low / stock.out into alerts #28
```

## Verify
```bash
for f in lib/inventory/*.js; do node --check "$f"; done
node --check routes/inventoryRoutes.js
npm run inventory:check
npm run inventory:smoke
```

Feature #66 done. Agle number ka intezaar.
