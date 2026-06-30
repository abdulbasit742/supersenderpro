# Feature #1 — Payments & Billing (Fulfillment)

**Cash.** Checkout, subscriptions, invoices, payment reminders. SuperSender already had a
payment gateway (`lib/paymentGateway`) and a full SaaS billing layer (`lib/saasBilling`), but
they were never connected: the webhook captured a payment and then **did nothing**. No invoice
got marked paid, no subscription got activated, no receipt or reminder went out. That's the
fulfillment gap. This department closes it.

## The gap (before)

`routes/paymentGatewayRoutes.js` → `POST /webhook/:gateway`:
```js
const result = gw.verifyWebhook(req.params.gateway, rawBody, req.headers);
if (!result.verified) return res.status(400).json({ ok:false, ...result });
res.json({ ok:true, received:true });   // <-- payment verified, then nothing happens
```
Meanwhile `saasBilling` had all the parts — `invoiceBuilder`, `licenseEngine`,
`renewalEngine` — but every one is draft/dry-run only and nothing ever called them on a
successful payment.

## The fix (this PR)

A self-contained bridge: **`lib/paymentFulfillment/`**. On a VERIFIED payment it runs the
full fulfillment chain, idempotently:

1. **Invoice → paid** via `saasBilling.invoiceBuilder.markPaidForReview()` (honours the
   existing auto-verify guard: auto-marks paid only when `SAAS_BILLING_AUTO_VERIFY_PAYMENTS`
   is on; otherwise it goes to manual review — unchanged behavior).
2. **License → active/renewed** via `saasBilling.licenseEngine.issueLicense()` /
   `renewLicense()` — the actual subscription activation.
3. **Receipt** built (full payment ref never stored) and dispatched through a pluggable
   notifier (draft-only until live notifications are on).
4. **Reminders** scheduled off the renewal date — pre-renewal (7/3/1 days before) and
   dunning (1/3 days after), dispatched draft-only until live.

### Files
- `lib/paymentFulfillment/config.js` — env-driven posture (dry-run default)
- `lib/paymentFulfillment/store.js` — own atomic JSON ledger (`data/payment-fulfillment.json`)
- `lib/paymentFulfillment/notify.js` — single outbound hook (`setNotifier`), masks targets
- `lib/paymentFulfillment/idempotency.js` — dedupe re-delivered webhooks
- `lib/paymentFulfillment/receiptBuilder.js` — receipts (ref masked)
- `lib/paymentFulfillment/reminderScheduler.js` — pre-renewal + dunning reminders
- `lib/paymentFulfillment/fulfillmentEngine.js` — the core chain
- `lib/paymentFulfillment/webhookHandlers.js` — Stripe event + local manual-verify normalizers
- `lib/paymentFulfillment/checkoutOrchestrator.js` — issue invoice draft + create checkout (links invoiceId in metadata)
- `lib/paymentFulfillment/doctor.js` — offline self-check + posture
- `lib/paymentFulfillment/index.js` — barrel
- `routes/paymentFulfillmentRoutes.js` — REST surface (`/api/payment-fulfillment`)
- `scripts/payment-fulfillment-check.js`, `tests/smoke/paymentFulfillmentSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched in this PR)
```js
const paymentFulfillmentRoutes = require('./routes/paymentFulfillmentRoutes');
app.use('/api/payment-fulfillment', paymentFulfillmentRoutes);

// optional: deliver receipts/reminders over your existing WhatsApp client
// require('./lib/paymentFulfillment').setNotifier(async (to, message) => waClient.sendMessage(to, message));
```
Server.js is 2.1MB so it isn't edited here (blind-rewrite risk) — add the 2 lines where the
other `app.use('/api/...')` mounts live.

### Stripe webhook
Point Stripe to `POST /api/payment-fulfillment/webhook/stripe`. The route verifies the
signature with the existing `lib/paymentGateway.verifyWebhook` (needs `STRIPE_WEBHOOK_SECRET`),
then fulfills `checkout.session.completed` / `invoice.payment_succeeded` / `invoice.paid`.
Set `tenantId`, `planId`, `invoiceId` in checkout `metadata` (the orchestrator does this for you).

### Local PKR rails (JazzCash/EasyPaisa/bank)
No signature, so an admin confirms: `POST /api/payment-fulfillment/manual-verify`
`{ tenantId, planId, paymentReference, invoiceId?, verifierConfirmed:true }`.

## Endpoints (`/api/payment-fulfillment`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /checkout` `{ tenantId, planId, customer:{email,phone} }` → invoice draft + checkout URL
- `POST /webhook/:gateway` — signed Stripe fulfillment (THE FIX)
- `POST /manual-verify` — local rail fulfillment (admin)
- `GET /fulfillments`, `GET /receipts/:tenantId`, `GET /reminders`, `POST /reminders/run`

## Safety
Dry-run by default. Shared billing/license state is mutated ONLY when a payment is verified
AND live fulfillment is on. Receipts + reminders are drafts until live notifications + a
notifier are set. Re-delivered webhooks are idempotent. Payment references are always masked.

## Env
```
PAYMENT_FULFILLMENT_ENABLED=true
PAYMENT_FULFILLMENT_DRY_RUN=true            # flip to false to go live
PAYMENT_FULFILLMENT_LIVE=false              # true + dry-run off => real invoice/license fulfillment
PAYMENT_FULFILLMENT_LIVE_NOTIFICATIONS=false # true + dry-run off => receipts/reminders actually send
PAYMENT_FULFILLMENT_REMINDER_OFFSETS=7,3,1,-1,-3
PAYMENT_FULFILLMENT_GRACE_DAYS=7
PAYMENT_FULFILLMENT_ADMIN_TOKEN=            # if set, manual-verify + reminders/run require x-admin-token
# existing gateway/billing keys still apply: STRIPE_*_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
# SAAS_BILLING_AUTO_VERIFY_PAYMENTS, etc.
```

## Verify
```bash
node --check lib/paymentFulfillment/index.js
for f in lib/paymentFulfillment/*.js; do node --check "$f"; done
node --check routes/paymentFulfillmentRoutes.js
npm run payment-fulfillment:check
npm run payment-fulfillment:smoke
```

Feature #1 done. Next number ka intezaar.
