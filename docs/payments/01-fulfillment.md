# Payments & Billing — Feature #1: Fulfillment (close the revenue leak)

## The bug this fixes

`lib/paymentGateway/index.js` `verifyWebhook()` only checks the signature and returns
`{ verified: true }`. The route then returned `{ ok: true }` and **stopped** — the order was never
marked paid, no subscription activated, no points awarded. **Customers paid and got nothing.**

## What shipped

| File | Purpose |
|------|---------|
| `lib/paymentGateway/fulfillment.js` | The missing step: after verification, actually deliver value. Idempotent, decoupled via injected hooks. |
| `routes/paymentGatewayRoutes.js` | Updated: verified webhook now calls `fulfillPayment`. Adds `/webhook/local` + `/fulfillment-log`. |

## What fulfillment does

1. **Normalise** the gateway payload (Stripe or local) into a single `PaymentEvent`.
2. **Idempotency** — same gateway event id is fulfilled once (gateways retry webhooks).
3. **Mark txn paid** in `txnStore` (restart-safe store from PR #33).
4. **Activate** the purchase via injected hooks (`activateOrder` / `activateSubscription`).
5. **Loyalty + referral** — award points and convert a pending referral (marketing #4).

## Wiring (server.js)

```js
const fulfillment = require('./lib/paymentGateway/fulfillment');
const loyalty = require('./lib/marketing/loyaltyEngine'); // if marketing PR is merged

fulfillment.configure({
  activateOrder: async ({ orderId }) => markOrderPaid(orderId),          // your order code
  activateSubscription: async ({ planId, customer }) => activatePlan(customer, planId),
  awardLoyalty: ({ customer, amount, reason }) => loyalty.earnFromOrder(customer, amount, reason),
  convertReferral: ({ customer }) => loyalty.convertReferral(customer)
});
```

The webhook route already calls `fulfillPayment` after a verified signature — you just supply what
"activate" means for your app via `configure()`.

### ⚠️ Middleware order (critical)
The Stripe webhook uses `express.raw()` for HMAC verification. It MUST be registered before any
global `express.json()` or the raw body is consumed and verification always fails. See
`docs/CRITICAL_FIXES.md` #4.

## API

```
POST /api/payments/webhook/:gateway   signature-verified gateway webhook (Stripe) -> verify + fulfill
POST /api/payments/webhook/local      local confirmation (JazzCash/EasyPaisa/bank), admin-token gated
GET  /api/payments/fulfillment-log    recent fulfillments (debug)
GET  /api/payments/status             gateway status
POST /api/payments/checkout           create a checkout session
```

## Payments & Billing roadmap (numbered)

- **#1 Fulfillment ✅ (this)** — deliver value after a verified payment.
- **#2 Subscription lifecycle** — renewals, cancellations, expiry, grace period.
- **#3 Invoices + receipts** — generate and send a receipt on fulfillment (pdfkit already a dep).
- **#4 Dunning** — retry failed payments + reminder drip (reuse marketing #2).
- **#5 Billing portal** — customer can see plan, history, upgrade/downgrade.

## Follow-up

- Local `/webhook/local` is admin-token gated (`PAYMENT_ADMIN_TOKEN`); set it so randoms can't mark
  payments paid.
- JSON-backed log; move to Postgres with the rest in the SaaS migration.
