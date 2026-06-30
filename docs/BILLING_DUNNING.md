# Billing Lifecycle Notifications (Dunning)

When a subscription changes state, tell the owner. **Dunning** (nudging a past-due customer) is a direct revenue lever - a friendly 'your payment failed, please update your card' recovers real money.

## Kinds
| Kind | Event emitted | When |
|---|---|---|
| `past_due` | `subscription.past_due` | payment failed (grace started) |
| `recovered` | `subscription.recovered` | payment succeeded after past_due |
| `canceled` | `subscription.canceled` | subscription deleted -> downgraded to Free |
| `upgraded` | `subscription.upgraded` | plan upgraded |

## Use
```js
const { notifySubscriptionEvent } = require('../lib/billing/notifications');
await notifySubscriptionEvent(tenantId, 'past_due', { to: ownerPhone, channels: ['whatsapp'] });
```
It (1) sends a templated message via the notify dispatcher (#322) across the chosen channels, and (2) emits the matching event on the bus (#344) -> webhooks + audit + metrics. Brand name comes from tenant settings (#342) if set.

Safe: notify is **dry-run by default** (prepares, doesn't send) and the function never throws.

## Wiring into Stripe (one-line follow-up)
In `lib/billing/stripe.js handleEvent`, call:
- `invoice.payment_failed` -> `notifySubscriptionEvent(tenantId, 'past_due', { to })`
- `invoice.payment_succeeded` -> `'recovered'`
- `customer.subscription.deleted` -> `'canceled'`
Left as a follow-up so this PR stays purely additive; recipient resolution (owner phone/email) is deployment-specific.

## Verify
```bash
node tests/smoke/dunningSmoke.js
```
