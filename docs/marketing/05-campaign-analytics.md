# Marketing Automation — Feature #5: Campaign Analytics

Turns the old log-only `analyticsEngine.js` into real reporting: delivery, open, click-through, and
conversion rates, plus revenue — per campaign, per segment, and overall.

## What shipped

| File | Purpose |
|------|---------|
| `lib/marketing/campaignAnalytics.js` | Record events + aggregate into rates/revenue rollups. |
| `routes/marketingAnalyticsRoutes.js` | Record + report API. |

## Funnel

```
sent -> delivered -> read(open) -> click -> conversion (+revenue)
```

Rates computed: delivery `%`, open `%`, click-through `%`, conversion `%`, and revenue per
conversion.

## API

```
POST /api/marketing/analytics/events            { campaignId, type, contact?, segmentId?, revenue? }
POST /api/marketing/analytics/events/bulk       { events: [...] }
GET  /api/marketing/analytics/campaign/:id      campaign report (rates + revenue)
GET  /api/marketing/analytics/campaign/:id/by-segment   per-segment breakdown
GET  /api/marketing/analytics/segment/:id       segment rollup across all campaigns
GET  /api/marketing/analytics/overview?from=&to=  overall summary
```

## Wiring (server.js + the other features)

```js
app.use('/api/marketing/analytics', require('./routes/marketingAnalyticsRoutes'));

const analytics = require('./lib/marketing/campaignAnalytics');

// when a drip or segment-broadcast sends, record it:
analytics.record({ campaignId, type: 'sent', contact: c.phone, segmentId });
// when an order is attributed to a campaign:
analytics.record({ campaignId, type: 'conversion', contact: phone, segmentId, revenue: order.total });
```

---

# ✅ Marketing Automation department — COMPLETE

All five numbered features shipped on branch `feat/marketing-automation-segments`:

| # | Feature | File(s) |
|---|---------|---------|
| 1 | **Segments** — dynamic rule-based audiences | `segmentEngine.js` + routes |
| 2 | **Drip campaigns** — send→wait→send executor | `dripEngine.js` + routes |
| 3 | **Segment broadcast** — one-click to a segment | `segmentBroadcast.js` + routes |
| 4 | **Loyalty + referrals** — points, tiers, referrals | `loyaltyEngine.js` + routes |
| 5 | **Campaign analytics** — rates + revenue reporting | `campaignAnalytics.js` + routes |

### How it all connects (the retention loop)

```
order paid -> loyalty points/tier (#4)
            -> contact enriched with loyaltyTier (#4 -> #1)
            -> segment matches "Gold VIPs" (#1)
            -> drip (#2) or segment broadcast (#3) targets them
            -> analytics (#5) measures opens/clicks/conversions + revenue
            -> repeat
```

From the old empty stubs (save-only campaign builder, never-running workflows, log-only analytics)
to a working, connected retention engine.

## Remaining (not code — integration)

- Wire the routes + injectors in `server.js` (each doc has the exact lines).
- Point all five at Postgres during the SaaS migration; the module APIs stay the same.
- Multi-instance: the drip executor (#2) should take a Redis lock so only one worker ticks.
