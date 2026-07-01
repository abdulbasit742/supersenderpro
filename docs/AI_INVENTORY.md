# AI Inventory & Restock Forecaster

Stockouts lose sales; overstock ties up cash. This tracks per-product stock + sales, computes **demand velocity** (recency-weighted units/day), **days-of-cover**, and a concrete **reorder recommendation** (reorder point + suggested order quantity from lead time + safety stock). The AI phrases the restock alert; all the forecasting is deterministic + explainable. Self-hosted Ollama; zero cloud cost.

## Why

\"Do you have this?\" + \"when should I reorder?\" are daily questions for any shop. Getting them wrong means lost sales or dead cash. A simple, honest velocity forecast tells you exactly what to reorder and when, automatically, from the sales you\'re already capturing.

## How it works

```
recordSale(product, qty) on each order  ->  per-product sales log + stock decrement
forecast(product):
  unitsPerDay   = recent sales / span (within velocityWindowDays)
  daysOfCover   = onHand / unitsPerDay
  reorderPoint  = unitsPerDay * (leadTimeDays + safetyDays)
  suggestedQty  = unitsPerDay * (leadTimeDays + safetyDays + 30) - onHand
  status        = healthy | low | stockout | idle | out
alertMessage(product) -> AI-phrased line  [template fallback]
```

- **Deterministic forecasting** (no model needed); the LLM only writes the alert sentence.
- **Configurable** lead time, safety days, low-cover threshold, velocity window.
- **Zero new npm dependencies.**

## Files

- `lib/inventory/inventoryForecast.js` — stock / sales / forecast / alerts.
- `routes/inventoryRoutes.js` — self-mountable router.
- `scripts/inventory-alerts.js` — daily alert sweep (cron-ready).
- `tests/smoke/inventoryForecastSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/inventory', require('./routes/inventoryRoutes'));
```

## Daily alerts cron (PC #1)

```bash
0 8 * * *  cd /path/to/supersenderpro && node scripts/inventory-alerts.js >> data/inventory/alerts.log 2>&1
```

## Environment / config

```
INVENTORY_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune via `PUT /api/inventory/config` (`leadTimeDays`, `safetyDays`, `lowCoverDays`, `velocityWindowDays`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/inventory/stock` | Set on-hand stock. Body: `{ product, onHand }` |
| POST | `/api/inventory/sale` | Record a sale (decrements). Body: `{ product, qty? }` |
| GET | `/api/inventory/forecast?product=` | Velocity, days-of-cover, reorder rec |
| GET | `/api/inventory/alerts?all=` | Items needing attention (or all) |
| GET | `/api/inventory/in-stock?product=&qty=` | Availability check |
| GET/PUT | `/api/inventory/config` | Read / tune thresholds |
| GET | `/api/inventory/health` | Brain status |

### Example

```bash
curl 'localhost:3000/api/inventory/forecast?product=Red%20Shirt'
# -> { onHand:12, unitsPerDay:3.2, daysOfCover:3.8, reorderPoint:32, needsReorder:true, suggestedQty:117, status:"low" }
```

## Wiring into the flow

1. On every confirmed order (order extraction #25), call `recordSale({ product, qty })` per line item. Stock + velocity stay current automatically.
2. Let the support agent (#1) answer \"in stock?\" via `inStock({ product })`, and the upsell engine (#40) avoid recommending out-of-stock items.
3. Surface `alerts` in the daily owner briefing (#29) so reordering is a morning glance.

## Tests

```bash
node tests/smoke/inventoryForecastSmoke.js
```
