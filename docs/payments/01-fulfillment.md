# Payments & Billing — Feature #1: Verified Webhook + Fulfillment

> The bug: `paymentGateway.verifyWebhook()` checked the signature and the route returned `{ ok:true }`
> — but **nothing marked the order paid or activated the plan**. Customers could pay and get nothing.
> This feature closes that gap.

## What shipped

| File | Purpose |
|------|---------|
| `lib/paymentGateway/fulfillment.js` | Turns a VERIFIED payment event into action: mark order paid + activate plan. Idempotent per event id. |
| `routes/paymentWebhookRoutes.js` | Hardened webhook: `express.raw` → verify signature → fulfill. Plus local-confirm + admin list. |

## Why this is #1

No reliable fulfillment = no revenue you can trust. Everything else in billing (plans, dunning,
invoices) sits on top of "money in → access on", so it goes first.

## How it works

1. Gateway hits `POST /api/payments/webhook/:gateway` with the raw body.
2. Route verifies the HMAC signature (`paymentGateway.verifyWebhook`). Bad signature → 400.
3. On success, `fulfillment.fulfill()` parses the event, then runs your hooks **once** per event id:
   - `markOrderPaid(ctx)` — flip your order/txn to paid
   - `activatePlan(ctx)` — enable the plan/subscription for the customer
   - `notifyCustomer(ctx)` — optional WhatsApp receipt
4. Only after hooks succeed is the event recorded as fulfilled. If a hook throws, the route returns
   5xx so the gateway **retries** (no lost activations, no double activations).

## Two critical correctness fixes baked in

- **Raw body for HMAC.** The route uses `express.raw()` so the signature is checked against the
  exact bytes. Mount this route BEFORE any global `express.json()`, or the signature will always
  fail (this was flagged as a latent bug).
- **Idempotency.** Stripe (and others) retry webhooks. Dedupe by event id means a customer is never
  charged-and-double-activated, and retries are safe.

## Wiring (server.js)

```js
// mount the webhook route EARLY (before global express.json):
app.use('/api/payments', require('./routes/paymentWebhookRoutes'));

// register fulfillment hooks once at startup:
const fulfillment = require('./lib/paymentGateway/fulfillment');
fulfillment.setHooks({
  markOrderPaid:  async (ctx) => updateOrderStatus(ctx.orderId, 'paid'),
  activatePlan:   async (ctx) => activateSubscription(ctx.customerEmail || ctx.customerPhone, ctx.planId),
  notifyCustomer: async (ctx) => waClient && ctx.customerPhone
    && waClient.sendMessage(`${ctx.customerPhone}@c.us`, `Payment received — your ${ctx.planId} plan is active. Thank you! 🎉`)
});
```

## Endpoints

```
POST /api/payments/webhook/:gateway   gateway webhook (stripe|local) — verify + fulfill
POST /api/payments/local/confirm      admin confirms a JazzCash/EasyPaisa/bank payment
GET  /api/payments/fulfillments       recent fulfilled payments (admin)
```

## Numbered roadmap (Payments & Billing)

- **#1 Verified webhook + fulfillment** ✅ (this)
- **#2 Plans & subscription state** — store active plan + period per customer; expiry handling.
- **#3 Usage metering + limit enforcement** — enforce the per-plan limits already defined in
  `lib/saasBilling/planRegistry.js`.
- **#4 Invoices & receipts** — generate PDF receipts (pdfkit is already a dep) + email/WhatsApp them.
- **#5 Dunning** — retry failed renewals, warn before downgrade, auto-suspend on non-payment.

## Follow-up

The idempotency ledger is JSON (`data/payments_fulfilled.json`); move to Postgres in the SaaS
migration so it's shared across instances (critical: webhook retries can land on any replica).
