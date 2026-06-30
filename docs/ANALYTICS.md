# Business Analytics Summary

The owner-facing KPIs: how is the business doing? Distinct from `/metrics` (#312), which is ops/Prometheus telemetry (latency, request counts).

## Endpoint
`GET /api/analytics/summary` (auth, tenant-scoped). Optional `?from=ISO&to=ISO` to bound revenue by date.

## Returns
```json
{
  "pipeline": { "totalDeals": 12, "won": 4, "lost": 2, "winRate": 67, "openValue": 320000, "wonValue": 180000, "byStage": {...} },
  "revenue":  { "currency": "PKR", "total": 180000, "invoiceCount": 4, "avgInvoice": 45000 },
  "customers":{ "total": 230, "byTier": { "VIP": 5, "Gold": 20, ... } },
  "carts":    { "total": 40, "byStatus": { "active": 8, "recovered": 12, "abandoned": 20 } },
  "usage":    { "messagesPerMonth": 4210 }
}
```

## How it's computed
Reads through `lib/db` + the sales/billing modules so the numbers match the rest of the app (pipeline uses `salesPipeline.metrics`, revenue sums `type:invoice` docs, usage from the billing meter). Tenant-scoped - one tenant never sees another's numbers.

## Pairs with
The ops dashboard (`/api/ops/ui`) shows system health; this is the **business** view - drop it into an owner dashboard or the daily brief.

## Verify
```bash
node tests/smoke/analyticsSmoke.js
```
