# Payments & Billing — Feature #5: Billing Portal

The customer-facing billing screen. An *aggregator* over #2–#4: one view of subscription + invoices +
dunning, plus upgrade/downgrade with prorated credit.

## What shipped

| File | Purpose |
|------|---------|
| `lib/saasBilling/billingPortal.js` | `overview(customer)` stitches everything; `changePlan()` upgrade/downgrade with proration. |
| `routes/billingPortalRoutes.js` | Overview + change-plan API. |

## API

```
GET  /api/billing/:customerId/overview              subscription + invoices + open dunning + plans
GET  /api/billing/:customerId/change-preview/:planId dry-run hint
POST /api/billing/:customerId/change/:planId        upgrade/downgrade -> { credit, amountDue }
```

## Wiring (server.js)

```js
const portal = require('./lib/saasBilling/billingPortal');
portal.setPlanCatalog([
  { id:'starter', name:'Starter', price:2000, periodDays:30 },
  { id:'growth',  name:'Growth',  price:5000, periodDays:30 },
]); // or pull from lib/saasBilling/planRegistry.js
app.use('/api/billing', require('./routes/billingPortalRoutes'));
```

---

# ✅ Payments & Billing department — COMPLETE

| # | Feature | Files | PR |
|---|---------|-------|----|
| 1 | **Fulfillment** — deliver value after verified payment | `paymentGateway/fulfillment.js` + routes | #50 |
| 2 | **Subscription lifecycle** — renew/cancel/expiry/grace | `subscriptionLifecycle.js` + routes | #54 |
| 3 | **Invoices + receipts** — numbering + PDF | `invoiceEngine.js` + routes | #59 |
| 4 | **Dunning** — failed-payment recovery | `dunningEngine.js` + routes | #63 |
| 5 | **Billing portal** — overview + plan change | `billingPortal.js` + routes | (this) |

### The billing loop

```
checkout -> verified webhook -> FULFILL (#1): mark paid, activate, points, invoice
          -> SUBSCRIPTION (#2): active, renews; on fail -> grace
          -> DUNNING (#4): reminders during grace -> recover or expire
          -> INVOICE/RECEIPT (#3): PDF to the customer
          -> BILLING PORTAL (#5): customer sees it all + can change plan
```

From a webhook that verified-then-did-nothing, to a full billing system.

## Remaining (integration, not code)
- Wire all routes + injectors in `server.js` (each doc has exact lines).
- Point storage at Postgres in the SaaS migration; module APIs stay the same.
- Multi-instance: lifecycle + dunning `tick()` should take a Redis lock so only one worker sweeps.
