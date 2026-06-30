# Geographic Analytics

The analytics angle the others miss: **where, physically, is your revenue?**
Channel = acquisition source, product = SKU, cohort = signup month, attribution
= touchpoint. None tell you that Karachi is 60% of revenue and Lahore is full of
signups who never buy. For a Pakistan-based WhatsApp commerce business, that
drives local ad spend, cash-on-delivery routing, and where to push next.

## What it does

Reads the `city` already stored on every CRM customer and rolls up per city:

- **customers, revenue, AOV, revenue-per-customer**
- **buyer rate** (% of that city's customers who've ordered)
- **active-in-30-days %**
- **revenue share** vs **customer share**

Then flags **opportunities**: cities with a meaningful customer share but a
lower revenue share (lots of people, not enough money — a conversion/upsell
target). City names are normalized (khi/Karachi, LHR/Lahore, casing) so one
place doesn't split into several rows.

Reads `storeCRM` only. Rebuilds nothing.

## Run it

```bash
npm run geo:check   # validate roll-up + normalization + opportunity logic
npm run geo:batch   # build snapshot -> public/geo/snapshot.json
```

Dashboard: **`/geo.html`** — ranked cities + underpenetrated list.

## Schedule on PC #2

```cron
22 3 * * *  cd /path/to/supersenderpro && node scripts/geo-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// GEO HOOK
app.use('/api', require('./routes/geoRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/geo/snapshot` | Cities + opportunities for one store |
| GET | `/api/geo/all` | All stores |

## Upgrade path

With real addresses/coordinates in Postgres later, this gains province roll-ups
and map rendering — only the engine input changes, the roll-up logic stays.
