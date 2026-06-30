# RFM Customer Segmentation

Buckets **every** customer into named, actionable marketing segments based on
**R**ecency (how recently they bought), **F**requency (how often), and
**M**onetary value (how much) — the classic retail/CRM segmentation that tells
you exactly who to treat like a VIP and who to stop spending on.

## What it does

1. Scores each customer **1–5** on R, F, M using **quintiles of your actual
   customer base** — so cutoffs adapt to this business, not arbitrary numbers.
2. Maps the R/F scores onto named segments: **Champions, Loyal, Potential, New,
   Needs Attention, At Risk, Can't Lose, Hibernating, Lost**.
3. Attaches a **playbook** to each segment (what to actually do).
4. Rolls up size + revenue share per segment, and (via the API) gives you the
   **member list** of any segment for targeting.

## Why it's not the churn module

Churn outputs a single **risk probability per customer** (a gauge). RFM buckets
the **whole base into marketing groups**, each with a different play. You use
churn to know *who's slipping*; you use RFM to decide *how to treat each group*.
They share the R/F/M inputs but answer different questions.

## Run it

```bash
npm run rfm:check   # validate quintile scoring + segment mapping on a fixture
npm run rfm:batch   # build snapshot -> public/rfm/snapshot.json
```

Dashboard: **`/rfm.html`** — segment cards with size, revenue share, and the action for each.

## Schedule on PC #2

```cron
23 3 * * *  cd /path/to/supersenderpro && node scripts/rfm-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// RFM HOOK
app.use('/api', require('./routes/rfmRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/rfm/snapshot` | Segment roll-up for one store |
| GET | `/api/rfm/all` | All stores |
| GET | `/api/rfm/segment/:name` | Members of a segment (masked) for targeting |

## Hook into win-back later

The Re-Engagement engine can target by RFM segment directly: "message everyone
in **Can't Lose** and **At Risk**" is a sharper audience than a flat churn-score
cutoff. `/api/rfm/segment/At%20Risk` returns exactly that list.
