# Product / SKU Performance

The other analytics modules answer *where* (channel), *when* (cohort), *which
touch* (attribution) and *who's leaving* (churn). This answers the one they
don't: **which products actually make the money** — and which are dead weight.

## What it does

Reads order line items from the CRM log and, per product, computes:

- **revenue, units, average price, revenue share**
- **repeat-buy rate** (share of a product's buyers who bought it more than once)
- **recency** (days since last sale)
- a **class**: `star` (big share + selling now), `steady`, `slow_mover` (tiny share, few units), `dormant` (nothing sold in 60 days)
- a **Pareto** summary: how few products make 80% of revenue

Reads `storeCRM` only. Rebuilds nothing. If a store has no per-order product
lines, it falls back to each customer's `preferredProducts` split across their
spend so the view isn't empty.

## Why it's not a duplicate

Channel performance (in Analytics) groups revenue by acquisition source.
Attribution credits touchpoints. Cohorts group by signup month. None of them
break revenue down **by product**, which is what you need to decide what to
restock, bundle, discount, or drop.

## Run it

```bash
npm run products:check   # validate aggregation + classification on a fixture
npm run products:batch   # build snapshot -> public/products/snapshot.json
```

Dashboard: **`/products.html`** — leaderboard, slow-mover list, Pareto.

## Schedule on PC #2

```cron
18 3 * * *  cd /path/to/supersenderpro && node scripts/products-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// PRODUCTS HOOK
app.use('/api', require('./routes/productsRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/products/snapshot` | Ranked products + summary for one store |
| GET | `/api/products/all` | All stores |

## Upgrade path

When orders move to Postgres with real line items (qty, SKU, cost), the engine
gains true margin analysis — only `lib/productAnalytics/index.js`'s collector
changes; `engine.js` stays the same.
