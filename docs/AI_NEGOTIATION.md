# AI Price Negotiation Assistant

Bargaining is the norm on WhatsApp in this market — "last price?", "thora kam karo", "5000 mein de do". This lets the bot **haggle for you, but always inside owner-set limits**: a per-product floor it will never cross, a max discount %, and a max number of rounds. The counter-offer math is **fully deterministic** (so the floor is mathematically guaranteed); the AI only phrases the reply to sound human. Self-hosted Ollama; zero cloud cost.

## Why

Manual haggling eats time and risks underselling, while a flat "no discount" bot loses price-sensitive buyers. This captures the deal at the best price you\'re willing to take, automatically, 24/7, and **never below your floor** — a guarantee, not a hope (the LLM never decides the number).

## Safety: the floor is guaranteed

The price is decided by a pure deterministic function `decide()`, then hard-clamped to `>= floor` before it\'s ever returned. The model is only asked to *phrase* the already-decided number. So no prompt, jailbreak, or hallucination can make the bot sell below your floor. The smoke test fuzzes 5,000 random scenarios to prove the invariant holds.

## How it works

```
set policy per product: { listPrice, floor, maxDiscountPct, maxRounds }
customer offers a price → decide(): accept | counter | hold_at_floor | reject (deterministic, floor-clamped)
   → anchor walks list → floor across rounds; counter = midpoint(anchor, max(offer,floor)), clamped ≥ floor
   → AI phrases the reply (Ollama)  [template fallback]
   → state tracked per (contact, product): rounds used, status, agreed price
```

- **accept:** offer ≥ floor (capped at list).
- **counter:** offer below floor and rounds remain — counter at a floor-safe midpoint.
- **hold_at_floor:** rounds exhausted — best-and-final at exactly the floor.
- Accepted deals lock (don\'t reopen to a lower number).
- **Zero new npm dependencies.**

## Files

- `lib/negotiation/negotiator.js` — policy + decide + handleOffer + state.
- `routes/negotiationRoutes.js` — self-mountable router.
- `tests/smoke/negotiationSmoke.js` — offline smoke test incl. floor fuzz check.

## Wiring it up (one line in server.js)

```js
app.use('/api/negotiation', require('./routes/negotiationRoutes'));
```

## Set your limits

```bash
curl -X PUT http://localhost:3000/api/negotiation/policy \
  -H 'Content-Type: application/json' \
  -d '{"defaults":{"maxDiscountPct":10,"maxRounds":3},"products":{"Pro Plan":{"listPrice":5000,"floor":4000}}}'
```

## Environment

```
NEGOTIATION_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET / PUT | `/api/negotiation/policy` | Read / set per-product limits |
| POST | `/api/negotiation/offer` | Handle a customer offer. Body: `{ phone, product, customerOffer, listPrice? }` |
| GET | `/api/negotiation/state` | Current negotiation state for a contact+product |
| POST | `/api/negotiation/reset` | Reset a negotiation |
| GET | `/api/negotiation/health` | Brain status |

### Example

```bash
curl -X POST http://localhost:3000/api/negotiation/offer \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx","product":"Pro Plan","customerOffer":3500}'
# -> { decision:"counter", price:4500, floor:4000, reply:"I can\'t go that low, but I\'ll meet you at PKR 4500...", round:1 }
```

## Wiring into the chat

1. When the support agent (#1) detects a haggling message ("last price?", a number lower than list), extract the offered amount + product and call `handleOffer({ phone, product, customerOffer })`.
2. Send `reply` to the customer.
3. On `accept`, hand the `price` to order extraction (#25) / checkout as the agreed unit price.
4. Pricing comes from the RAG catalog (#3) or your `PUT /policy` config.

## Tests

```bash
node tests/smoke/negotiationSmoke.js
```
