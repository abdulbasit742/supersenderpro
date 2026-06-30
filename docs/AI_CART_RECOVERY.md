# AI Abandoned-Cart Recovery

A customer described an order but never said CONFIRM — that's an abandoned cart, and on WhatsApp it's highly recoverable with one good nudge. This **detects stalled draft orders**, drafts a **personalized win-back message** from the customer's actual cart (via self-hosted Ollama), and runs a **multi-step follow-up cadence** with an optional escalating incentive, timed to respect send-time + anti-ban. Zero cloud cost.

## Why

Abandoned carts are the single highest-ROI message you can send: the customer already wanted it. Pairing detection with a personalized, well-timed nudge recovers revenue that would otherwise just evaporate, automatically.

## How it works

```
order extraction (#25) leaves a DRAFT → customer goes quiet
scan() → detect drafts older than CART_STALL_HOURS, not confirmed/recovered
       → draft personalized message (Ollama) from the real cart
       → build cadence: +0h, +24h, +72h (final carries an incentive)
       → timed via send-time optimizer (#21) if present
       → queue worker sends each step; CONFIRM → markRecovered (stops cadence)
```

- **Reuses order-extraction drafts (#25)** as the source of truth for what's in the cart.
- **Send-time aware (#21):** each step aligns to the contact's best hour when the optimizer is present.
- **Graceful fallback:** no model → clean template messages. Final step always includes an opt-out.
- **Idempotent:** an active cadence is never double-started; recovered/exhausted carts are excluded.
- **Zero new npm dependencies.**

## Files

- `lib/cartRecovery/cartRecovery.js` — detect / draft / cadence / scan / recovered.
- `routes/cartRecoveryRoutes.js` — self-mountable router.
- `scripts/cart-recovery-batch.js` — hourly sweep runnable (cron-ready).
- `tests/smoke/cartRecoverySmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/cart-recovery', require('./routes/cartRecoveryRoutes'));
```

## Hourly sweep + sending

The batch only PLANS cadences (each step has a `whenISO`). Sending is delegated to your queue so it stays within your existing throttle:

```bash
# hourly: detect stalled carts + list due steps
0 * * * *  cd /path/to/supersenderpro && node scripts/cart-recovery-batch.js >> data/cart_recovery/batch.log 2>&1
```

A small worker should: take due steps, send via the WhatsApp engine, then `POST /api/cart-recovery/step-sent`. When the customer replies CONFIRM (order-extraction confirm), call `POST /api/cart-recovery/recovered` to stop the cadence.

## Environment

```
CART_RECOVERY_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
CART_STALL_HOURS=2                # how long a draft sits before it's "abandoned"
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/cart-recovery/scan` | Detect stalled carts + build cadences |
| POST | `/api/cart-recovery/draft` | Draft one win-back message. Body: `{ order, step?, incentive? }` |
| POST | `/api/cart-recovery/cadence` | Build a cadence for one cart. Body: `{ phone, order, total? }` |
| GET | `/api/cart-recovery/active` | List active recoveries |
| POST | `/api/cart-recovery/recovered` | Stop a cadence (customer confirmed). Body: `{ phone }` |
| POST | `/api/cart-recovery/step-sent` | Mark a step sent. Body: `{ phone, step }` |
| GET | `/api/cart-recovery/health` | Brain + send-time wiring |

### Example

```bash
curl -X POST http://localhost:3000/api/cart-recovery/scan -H 'Content-Type: application/json' -d '{}'
# -> { stalled: 4, started: 4, cadences: [{phone, steps:3}, ...] }
```

## Tests

```bash
node tests/smoke/cartRecoverySmoke.js
```
