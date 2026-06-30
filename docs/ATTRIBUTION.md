# Marketing Attribution (multi-touch)

Analytics' "channel performance" answers *where did revenue land* (last-click).
This answers the harder question: **which channels actually drove the sale**
across the whole customer journey. It's the "attribution" slice of the PC #2
overnight batch.

## What it does

1. Reconstructs each customer's **journey** from the CRM interaction log: the
   ordered touchpoints (messages, broadcasts, follow-ups, re-engagement, loyalty
   events) leading up to each order, tagged by channel + campaign.
2. Runs **5 attribution models** over every journey and rolls credited revenue
   up by channel and by campaign.
3. Shows them **side by side** so you can see, e.g., Instagram opens deals
   (big on first-touch) while WhatsApp closes them (big on last-touch).

Reads `storeCRM` only. Rebuilds nothing. A customer with orders but no recorded
touches gets a single synthetic touch from their acquisition source, so revenue
is never dropped.

## The 5 models

| Model | Credit rule | Good for |
|---|---|---|
| **First touch** | 100% to the first touch | Finding what *starts* relationships |
| **Last touch** | 100% to the converting touch | Matches naive analytics; what *closes* |
| **Linear** | Split evenly across all touches | Fair baseline, long journeys |
| **Time decay** | More credit to recent touches (7-day half-life) | Short sales cycles |
| **Position-based** | 40% first, 40% last, 20% middle (U-shaped) | Balancing opener + closer |

All model weights sum to 1 per journey, so total attributed revenue equals total
revenue under every model — only the *distribution* changes.

## Run it

```bash
npm run attribution:check   # validate install + the model math
npm run attribution:batch   # build snapshot -> public/attribution/snapshot.json
```

Dashboard: **`/attribution.html`** — compare all 5 models, spot openers vs closers.

## Schedule on PC #2

```cron
15 3 * * *  cd /path/to/supersenderpro && node scripts/attribution-batch.js
```

Env: `ATTRIBUTION_LOOKBACK_DAYS` (default 90) — how far back to trace a journey.

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// ATTRIBUTION HOOK
app.use('/api', require('./routes/attributionRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/attribution/snapshot` | All 5 models for one store |
| GET | `/api/attribution/all` | All stores |
| GET | `/api/attribution/model/:model` | One model's channel + campaign breakdown |

## Upgrade path

When Postgres lands, journeys come from SQL instead of the JSON log — only
`lib/attribution/journeys.js` changes. The models and roll-up stay identical.
