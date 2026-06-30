# Metric Anomaly Detection & Founder Alerts

The **watchdog**. The rest of the analytics suite makes you go *look* at
dashboards; this comes to *you* the moment something moves in a way that isn't
normal: a revenue drop, an orders collapse, a churn-risk spike, a surge in
failed sends. It's the proactive layer on top of everything else, and the last
slice of the PC #2 overnight batch.

## How it works

1. Assembles each metric's **daily series** (reusing the forecast series builder
   for revenue/orders + the CRM log for new customers / failed sends).
2. Scores the latest day with a **robust z-score**: median + MAD (median absolute
   deviation) instead of mean + std-dev, so one giant spike doesn't poison the
   baseline and mask the next anomaly.
3. The **rule layer** turns scores into alerts that know direction sentiment
   (a revenue *drop* is bad; a revenue *spike* is good news worth surfacing; a
   churn-risk *spike* is bad). Severity = how extreme the z-score is.
4. Alerts are **deduped** (metric + date + direction) so you're not re-pinged on
   every run, and optionally **pushed to the owner over WhatsApp**.

Reads existing modules (forecasting, storeCRM, churn model). Rebuilds nothing;
a missing source just skips that metric.

## Severity

| Severity | Meaning |
|---|---|
| **critical** | Bad move, robust-z ≥ 4 (revenue fell off a cliff, etc.) |
| **warning** | Bad move, robust-z ≥ 3 |
| **notice** | Bad move, just over threshold |
| **positive** | A *good* surprise (revenue/orders spiked) |

## Run it

```bash
npm run alerts:check   # validate detector math on known spike/drop fixtures
npm run alerts:batch   # scan all stores, write feed, (dry-run) owner push
```

Dashboard: **`/alerts.html`** — severity-sorted feed, dismiss handled alerts.

## Schedule on PC #2 (after forecast)

```cron
35 3 * * *  cd /path/to/supersenderpro && node scripts/alerts-batch.js
```

### Owner WhatsApp push (optional)

Dry-run by default. To actually push critical/warning alerts to the owner:

```bash
ALERTS_PUSH=true OWNER_WHATSAPP=92300xxxxxxx node scripts/alerts-batch.js
```

It uses the global `sendDirect` if the app has wired one; otherwise it prints
what it *would* send.

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// ALERTS HOOK
app.use('/api', require('./routes/alertsRoutes')());
```

| Method | Path | Does |
|---|---|---|
| GET | `/api/alerts` | Current deduped feed |
| POST | `/api/alerts/scan` | Recompute now |
| POST | `/api/alerts/:key/ack` | Dismiss an alert |

## Why robust z-score (not mean/std-dev)

Real commerce data is spiky (a viral day, a big B2B order). Mean + std-dev get
dragged around by those outliers, so the baseline inflates and you stop
detecting the next real problem. Median + MAD shrug off outliers, giving a
stable "normal" to measure against. No ML, no deps, fully explainable.
