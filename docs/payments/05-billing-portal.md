# Payments & Billing — Feature #5: Billing Portal

The customer-facing "My Billing" view. A read/aggregate layer over the engines already built — it owns
no storage of its own.

## What shipped

| File | Purpose |
|------|---------|
| `lib/saasBilling/billingPortal.js` | `getCustomerBilling()` (plan + invoices + open dunning + summary) and `changePlan()`. |
| `routes/billingPortalRoutes.js` | `GET /api/billing/:customerId`, `POST /api/billing/:customerId/change-plan`. |

## What the customer sees

```
GET /api/billing/:customerId  ->
{
  subscriptions: [ { planId, status, currentPeriodEnd, access, ... } ],
  invoices:      [ { number, status, total, issuedAt, paidAt } ],
  openDunning:   [ { planId, status, stepIndex } ],
  summary: { activePlans, hasPastDue, lifetimeInvoices, lifetimePaid }
}
```

## Change plan (upgrade/downgrade)

```
POST /api/billing/:customerId/change-plan   { fromPlanId?, toPlanId }
```
Activates the new plan now and cancels the old at period end (keeps paid-for access until it lapses).

## Wiring (server.js)
```js
app.use('/api/billing', require('./routes/billingPortalRoutes'));
```
No extra config — it reads from lifecycle (#2), invoices (#3), dunning (#4) directly.

---

# ✅ Payments & Billing department — COMPLETE

| # | Feature | File(s) |
|---|---------|---------|
| 1 | **Fulfillment** — deliver value after verified payment | `paymentGateway/fulfillment.js` |
| 2 | **Subscription lifecycle** — renew/cancel/expiry/grace | `saasBilling/subscriptionLifecycle.js` |
| 3 | **Invoices + receipts** — numbered, PDF | `saasBilling/invoiceEngine.js` |
| 4 | **Dunning** — failed-payment recovery | `saasBilling/dunningEngine.js` |
| 5 | **Billing portal** — customer billing view + plan change | `saasBilling/billingPortal.js` |

## The money loop (end to end)

```
checkout -> gateway -> verified webhook
  -> fulfillment (#1): mark paid, activate, award loyalty, invoice+receipt (#3)
  -> subscription active (#2)
      -> renews on time            -> stays active
      -> renewal fails             -> past_due + grace (#2)
          -> dunning reminders (#4) -> recovered  OR  exhausted -> expired
  -> customer sees it all in the billing portal (#5), can upgrade/downgrade
```

From a webhook that verified-and-did-nothing to a full billing system: payments are delivered,
subscriptions managed, receipts issued, failed payments chased, and the customer has a portal.

## Integration checklist (server.js — not auto-applied; 2.1MB file)
- Mount all payments routes (`/api/payments`, `/api/subscriptions`, `/api/invoices`, `/api/dunning`, `/api/billing`).
- `fulfillment.configure({...})` to define activateOrder/activateSubscription + loyalty hooks.
- `subs.setHooks({ onPastDue: dunning.openCase, onExpire: revokeAccess, onActivate: grantAccess })`.
- Cron: `subs.tick()` + `dunning.tick()` hourly.
- Multi-instance: tick()s need a Redis lock so only one worker runs them.
- Postgres: move all `data/*.json` here in the SaaS migration; module APIs stay the same.
