# Marketing Automation — Feature #1: Segments Engine

> The Marketing Automation department was scaffolded but empty: `campaignBuilder` only saved drafts,
> `automationWorkflows` never ran, `analyticsEngine` only logged. This is the real rebuild, shipped
> one numbered feature at a time. **#1 is segments** — the "who do we target" foundation everything
> else depends on.

## What shipped

| File | Purpose |
|------|---------|
| `lib/marketing/segmentEngine.js` | Define segments as rule sets and evaluate contacts against them. |
| `routes/marketingSegmentsRoutes.js` | CRUD + live preview API. |

## Concept

A **segment** is a saved set of rules. Membership is computed on demand, so lists never go stale.

```json
{
  "name": "VIP — active spenders",
  "match": "all",
  "rules": [
    { "field": "totalSpent", "op": "gte", "value": 5000 },
    { "field": "lastOrderDaysAgo", "op": "lte", "value": 30 }
  ]
}
```

### Operators
`eq, neq, gt, gte, lt, lte, contains, in, nin, has, exists, empty`

### Virtual fields (computed per contact)
- `lastOrderDaysAgo`, `firstOrderDaysAgo`, `createdDaysAgo` — days since those dates
- `hasOrdered` — true if `orderCount > 0`

Real contact fields (e.g. `totalSpent`, `orderCount`, `city`, `tags`, `optedIn`) are read directly.

## API

```
GET    /api/marketing/segments            list
GET    /api/marketing/segments/operators  operator reference (for the rule UI)
POST   /api/marketing/segments            create { storeId?, name, rules, match }
GET    /api/marketing/segments/:id        fetch one
PUT    /api/marketing/segments/:id        update { name?, rules?, match? }
DELETE /api/marketing/segments/:id        delete
GET    /api/marketing/segments/:id/preview who matches right now (count + sample)
```

## Wiring (server.js)

```js
const segmentsRouter = require('./routes/marketingSegmentsRoutes');
// Let preview pull from your real CRM contacts:
segmentsRouter.setContactLoader((storeId) => loadCrmContacts(storeId)); // return an array
app.use('/api/marketing/segments', segmentsRouter);
```

The engine is storage-agnostic: the caller supplies contacts, so segments work against the CRM you
already have without coupling to it.

## Numbered roadmap (Marketing Automation)

- **#1 Segments engine** ✅ (this) — dynamic, rule-based audiences.
- **#2 Drip campaigns** — multi-step sequences (send → wait → send) targeting a segment, with a real
  scheduler/executor (the missing piece in `automationWorkflows`).
- **#3 Broadcast targeting by segment** — feed a segment straight into the one-click broadcast hub.
- **#4 Loyalty + referral wiring** — earn/redeem events that move contacts between segments.
- **#5 Campaign analytics** — turn the raw event log into open/click/conversion reporting per
  campaign and per segment.

## Follow-up

JSON-backed today (matches the rest of the app). Move `data/marketing_segments.json` to Postgres in
the SaaS migration; the module API stays the same.
