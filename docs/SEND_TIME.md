# Best Time to Send (Engagement Timing)

You have a broadcast tool — but blasting at the wrong hour wastes it. This finds
**when your customers are actually awake and responding**, so you schedule sends
for maximum reach.

## What it does

Bins every customer interaction (inbound messages, replies, orders, redemptions)
into a **7 (day) × 24 (hour)** grid, **in the customer's timezone** (default
`Asia/Karachi`, configurable via `SENDTIME_TZ`), and surfaces:

- the **engagement heatmap** (darker = more activity)
- **peak day** + **peak hour**
- the **top 5 send windows** with the share of activity each captures

## Why it's not the forecast module

Forecast's day-of-week index predicts how much **revenue** a future day brings.
This is about **intraday responsiveness** — which *hour* to hit send. Different
question, different grain (hour vs day), different use (scheduling vs planning).

Reads `storeCRM` interactions only. Rebuilds nothing.

## Run it

```bash
npm run sendtime:check   # validate binning + timezone bucketing + peak detection
npm run sendtime:batch   # build snapshot -> public/send-time/snapshot.json
```

Dashboard: **`/send-time.html`** — heatmap + recommended windows.

## Schedule on PC #2

```cron
24 3 * * *  cd /path/to/supersenderpro && node scripts/sendtime-batch.js
```

Env: `SENDTIME_TZ` (default `Asia/Karachi`).

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// SENDTIME HOOK
app.use('/api', require('./routes/sendTimeRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/send-time/snapshot` | Heatmap + windows for one store |
| GET | `/api/send-time/all` | All stores |

## Hook into broadcasts later

The natural next step: the broadcast scheduler reads `summary.bestWindow` (or
`recommendations[0]`) to default the send time, and the Re-Engagement batch
schedules its follow-ups into the top window instead of "now".
