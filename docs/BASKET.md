# Market-Basket / Product Affinity

Product performance tells you *which products make money*. This tells you *which
products sell **together*** — the input for bundles and "customers who bought X
also bought Y" cross-sell prompts.

## What it does

Treats each customer's purchased products as a **basket** and finds product
**pairs** that co-occur, scored with the three standard association metrics:

- **support(A,B)** — how common the pair is overall
- **confidence(A→B)** — if they buy A, how often they also buy B
- **lift(A,B)** — confidence ÷ B's popularity. **Lift > 1 = real affinity** (they
  sell together more than chance would predict, not just two popular items)

It ranks pairs by lift and builds a per-product recommendation list
("also bought") for live cross-sell.

## Honest data caveat

The current data has no per-**order** line grouping, so a basket = the set of
products a **customer** has bought over time. That still surfaces genuine
co-purchase affinity (great for bundles + cross-sell). When true order-level
baskets land (Postgres line items), only `collectBaskets()` changes; the metrics
stay identical.

## Why it's not the product module

Product performance ranks products **individually** (revenue, units, stars vs
slow movers). This is purely about **relationships between** products. Different
question, different action (bundle/cross-sell vs restock/drop).

## Run it

```bash
npm run basket:check   # validate support/confidence/lift on a planted fixture
npm run basket:batch   # build snapshot -> public/basket/snapshot.json
```

Dashboard: **`/basket.html`** — top pairs by lift + suggested pitch direction.

## Schedule on PC #2

```cron
19 3 * * *  cd /path/to/supersenderpro && node scripts/basket-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// BASKET HOOK
app.use('/api', require('./routes/basketRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/basket/snapshot` | Top pairs + recommendations for one store |
| GET | `/api/basket/all` | All stores |
| GET | `/api/basket/recommend/:product` | "Also bought" list for one product |

## Hook into the bot later

The product/sales bot can call `/api/basket/recommend/:product` right after a
customer adds an item: "Customers who bought this also love ___" — turning the
affinity graph into live cross-sell revenue.
