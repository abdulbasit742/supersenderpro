# Marketing Automation — build log

Goal: turn a one-time buyer into a repeat customer, automatically. Drip campaigns, segments,
broadcast, loyalty/referral — all working, not stubs.

Features are numbered. Each number = one focused, shippable feature, coded and pushed.

## Why the existing modules didn't count

`lib/marketing/*` and `lib/referralProgram.js` existed but were thin stubs: `campaignBuilder` only
created a draft object (never sent), `automationWorkflows` saved a workflow but never ran it,
`audienceManager` was a flat contact list with no rules. This effort replaces stubs with real,
working pieces.

---

## ✅ #1 — Dynamic Segmentation Engine (this branch)

**Files:** `lib/marketing/segmentEngine.js`, `routes/marketingSegmentRoutes.js`

Everything in marketing needs to answer "who receives this?". A **segment** is a saved set of RULES
(not a frozen list), so it always resolves to the *current* matching contacts.

- Rule tree: OR across groups, AND within a group (configurable per level).
- Operators: `eq, neq, gt, gte, lt, lte, contains, in, exists, within` (relative date window like `7d`).
- Works over any contact field incl. dot-paths (`location.city`), tags arrays, and behavioural dates.
- Pluggable contact source via `setContactSource()` — JSON CRM today, Postgres later, no caller change.
- API: list/create/update/delete, `POST /preview` (try rules live before saving), `GET /:id/evaluate`.

Wire-up (server.js):
```js
const segmentEngine = require('./lib/marketing/segmentEngine');
segmentEngine.setContactSource(() => customers); // the app's live contacts
app.use('/api/marketing/segments', require('./routes/marketingSegmentRoutes'));
```

Example segment (VIPs who spent 5k+ and were active in the last 30 days):
```json
{
  "name": "Active VIPs",
  "rules": { "match": "all", "groups": [
    { "match": "all", "conditions": [
      { "field": "tags", "op": "contains", "value": "vip" },
      { "field": "totalSpent", "op": "gte", "value": 5000 },
      { "field": "lastOrderAt", "op": "within", "value": "30d" }
    ]}
  ]}
}
```

## Planned next (waiting for the next number)

- **#2 Drip Campaign engine** — multi-step sequences (wait → send → condition) targeted at a segment, using the broadcast hub + queue to actually send and the segment engine to pick recipients.
- **#3 Campaign scheduler + execution worker** — cron/queue-driven runner that advances each contact through a drip and logs delivery.
- **#4 Loyalty engine** — points, tiers, earn/redeem rules.
- **#5 Referral engine v2** — real reward fulfilment + attribution (the current `referralProgram.js` only mints codes).
- **#6 Analytics** — open/click/convert per campaign + per segment.

> Persistence note: like the rest of the app this uses JSON files. When the Postgres migration lands (SaaS roadmap), move segments/campaigns/loyalty to the DB; the pluggable contact source already makes that swap clean.
