# Reorder / Replenishment Predictor

Predicts when a customer will run out of a consumable product and drafts a
friendly Roman-Urdu reorder nudge. **Deterministic core, Ollama-optional**: the
prediction math runs with no model; the local model only warms up the wording,
and falls back to a template if it's offline.

## Why it matters (PK commerce)

Consumables (shampoo, supplements, filters, formula, pet food, printer ink) get
rebought on a rhythm. If you nudge a day or two before they run out, you win the
reorder instead of losing it to whoever's closest. This turns purchase history
into recurring revenue, no ad spend.

## How prediction works

Per `(customer, sku)`:

1. **History (preferred):** with 2+ purchases, take the **median gap** between
   consecutive buys, normalized per unit, as the consumption cadence.
2. **Merchant hint:** if only one purchase exists but you passed
   `expectedDaysPerUnit`, cadence = `expectedDaysPerUnit * qty`.
3. Otherwise we skip (not enough signal, no guessing).

`runOutAt = lastPurchaseAt + cadenceDays`. Anyone whose run-out lands inside the
`horizonDays` window (default 7) is flagged **due** and gets a drafted nudge.

## Endpoints

Mount via `lib/bootstrap/registerSubsystems.js` or directly:

```js
app.use('/api/reorder', require('./routes/reorderPredictorRoutes')());
```

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| GET  | `/api/reorder/health`   | -     | liveness |
| POST | `/api/reorder/purchase` | admin | record a purchase |
| GET  | `/api/reorder/predict`  | -     | run-out predictions (phones masked) |
| GET  | `/api/reorder/nudges`   | admin | dry-run reorder drafts |

Tenant via `x-tenant-id` header (or `tenantId` in body/query). Admin writes via
`x-admin-secret` matching `ADMIN_TOKEN` (skipped if unset in dev).

### Record a purchase

```bash
curl -X POST localhost:3000/api/reorder/purchase \
  -H 'x-tenant-id: shopA' -H 'x-admin-secret: $ADMIN_TOKEN' \
  -H 'content-type: application/json' \
  -d '{"customerId":"c1","phone":"923001234567","sku":"shampoo","name":"Shampoo 250ml","qty":1}'
```

### Get dry-run nudges

```bash
curl 'localhost:3000/api/reorder/nudges?horizonDays=7' \
  -H 'x-tenant-id: shopA' -H 'x-admin-secret: $ADMIN_TOKEN'
```

```json
{
  "ok": true,
  "count": 1,
  "drafts": [
    {
      "customerId": "c1",
      "phoneMasked": "923****67",
      "sku": "shampoo",
      "name": "Shampoo 250ml",
      "daysToRunOut": 2,
      "basis": "history",
      "message": "Assalam o alaikum! Aap ka *Shampoo 250ml* ~2 din me khatam hone wala hai...",
      "dryRun": true
    }
  ]
}
```

## Guarantees

- **Dry-run only** - drafts nudges, never auto-sends.
- **Tenant-scoped** - missing/invalid `tenantId` throws; data isolated under
  `data/reorderPredictor/<tenantId>/`.
- **Phones masked** in every API response.
- **Zero new deps**, **server.js untouched**, offline smoke test in
  `tests/smoke/reorderPredictorSmoke.js`.

## Wiring it into the daily loop

Run `buildNudges()` from your morning cron, push the drafts to the team inbox
for a quick human OK, then send. Predictions sharpen automatically as more
purchase history accrues.
