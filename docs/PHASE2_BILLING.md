# Phase 2 - Plans, Subscriptions & Stripe Billing

The revenue switch. Plans + per-tenant subscriptions + Stripe checkout/webhook + usage metering + quota enforcement. Gated behind auth (PR #90) and the tenant data layer (PR #86).

## What's here
| File | Role |
|---|---|
| `lib/billing/plans.js` | Plan registry: Free / Starter / Pro with limits (seats, messages, broadcasts, contacts) |
| `lib/billing/index.js` | Per-tenant subscription state, usage metering, quota checks |
| `lib/billing/stripe.js` | Checkout session + webhook verify + subscription lifecycle (safe stub when unconfigured) |
| `middleware/enforcePlan.js` | Gate routes by quota (warn-only by default) |
| `routes/billingRoutes.js` | `/plans /subscription /usage /quota/check /checkout` + `/webhook/stripe` |

## Subscription lifecycle (webhook-driven, idempotent)
- `checkout.session.completed` -> activate tenant on the purchased plan.
- `invoice.payment_succeeded` -> renew (clear grace).
- `invoice.payment_failed` -> **dunning**: mark `past_due` + set `graceUntil` (default 3 days). Not an instant cutoff.
- `customer.subscription.deleted` -> downgrade to Free.

## Endpoints (`/api/billing`)
| Method | Path | Access |
|---|---|---|
| GET | `/plans` | public |
| GET | `/subscription` | auth |
| GET | `/usage` | auth |
| POST | `/quota/check` | auth |
| POST | `/checkout` | auth (creates Stripe Checkout) |
| POST | `/subscription/plan` | owner (manual/comped) |
| POST | `/webhook/stripe` | public, raw body, signature-verified |

## Enforcement
`enforcePlan('message')` etc. Default `BILLING_ENFORCE=warn` (logs + `X-Quota-Remaining` header). Set `BILLING_ENFORCE=block` to return 402 over quota. Roll out warn-first, then flip to block.

## Wire + verify
```bash
node scripts/wire-billing.js
node tests/smoke/billingSmoke.js   # 8 checks, no live Stripe needed
```

## Going live
1. `npm i stripe`
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`.
3. Point a Stripe webhook at `/api/billing/webhook/stripe` (events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted).
4. Verify the webhook path receives the **raw** body (not pre-parsed by global json()).

## Env
```
BILLING_CURRENCY=PKR
BILLING_DEFAULT_PLAN=free
BILLING_ENFORCE=warn               # warn | block
BILLING_GRACE_DAYS=3
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
APP_URL=https://your-app
```
