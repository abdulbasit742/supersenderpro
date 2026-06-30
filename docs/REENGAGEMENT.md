# Automated Re-Engagement / Win-Back

The **hands** that act on the analytics **brain**. Feature #1 (Analytics & Insights)
tells you *who's about to churn and how much revenue is at risk*. This turns that
into actual recovered revenue: it builds a daily win-back batch, writes the
messages, and queues the WhatsApp follow-ups — overnight, on PC #2.

## What it does

1. Reads the **churn "save these first"** list (from `lib/analyticsInsights/churnModel`) + CRM data.
2. Filters to customers worth re-engaging (risk ≥ threshold, opted-in, not blocked, off cooldown).
3. Picks a **win-back template** per customer (high-value-with-offer, gentle nudge, first-order, lapsed-subscriber) and renders it with `lib/mergeFields` (name, business, loyalty perk, spintax).
4. Plans a campaign you can **preview**, then **execute**.

It does **not** rebuild anything: sending rides the existing `queueManager`
(`follow_up` jobs → BullMQ when Redis is up, JSON fallback otherwise) and
`storeCRM.scheduleFollowUp` so it lands on the customer timeline.

## Safety rails (important)

- **Dry-run by default.** Nothing is sent unless `REENGAGE_LIVE=true`. Dry-run shows you the exact plan + messages.
- **Daily cap** (`REENGAGE_DAILY_CAP`, default 50) so you never blast the whole list.
- **Per-customer cooldown** (`REENGAGE_COOLDOWN_DAYS`, default 14) so nobody gets re-messaged too soon.
- **Opt-out + blocked respected**, phone numbers masked in the dashboard + logs.

## Env

```bash
REENGAGE_LIVE=false          # true to actually queue sends
REENGAGE_DAILY_CAP=50        # max win-back messages per store per day
REENGAGE_COOLDOWN_DAYS=14    # don't re-message within N days
REENGAGE_MIN_RISK=40         # skip customers below this churn risk
```

## Run it

```bash
npm run reengage:plan     # print today's plan as JSON (sends nothing)
npm run reengage:batch    # plan + execute for all stores (dry-run unless REENGAGE_LIVE=true)
npm run reengage:check    # validate install + pipeline (isolated, never sends)
```

Dashboard: **`/reengagement.html`** — preview who'd be reached, read each
message, then Execute.

## Schedule on PC #2 (after the analytics batch)

```cron
0 3 * * *   cd /path/to/supersenderpro && node scripts/analytics-batch.js
30 3 * * *  cd /path/to/supersenderpro && REENGAGE_LIVE=false node scripts/reengage-batch.js
```

Eyeball a few dry-run plans, then flip `REENGAGE_LIVE=true`.

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// REENGAGEMENT HOOK
app.use('/api', require('./routes/reEngagementRoutes')());
```

| Method | Path | Does |
|---|---|---|
| GET | `/api/reengage/plan` | Preview today's plan (sends nothing) |
| GET | `/api/reengage/campaigns` | List recent campaigns |
| GET | `/api/reengage/campaigns/:id` | One campaign |
| POST | `/api/reengage/campaigns/:id/execute` | Execute (dry-run unless live; `{"force":true}` to override) |

## Upgrade path

When Postgres lands, nothing here changes — it reads customers through the same
modules. When you want smarter targeting, the template picker in
`lib/reEngagement/templates.js` is the one place to evolve.
