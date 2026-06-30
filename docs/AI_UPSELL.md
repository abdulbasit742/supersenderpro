# AI Upsell & Cross-Sell Recommender

At the right moment — an order forming, a product viewed — suggest complementary add-ons or an upgrade. Raising average order value is the cheapest revenue there is, and "customers who bought X also bought Y" is the highest-converting nudge in commerce. This learns what sells together from your own purchases and phrases a natural WhatsApp cross-sell line via self-hosted Ollama. Zero cloud cost.

## Why

You already have the customer with their wallet out. One well-placed "want a case with that?" lifts AOV with near-zero effort. Built on YOUR co-purchase data, it gets sharper the more you sell, no generic guesses.

## How it works

```
recordPurchase(items)  → item counts + co-occurring pairs (file-backed, learns over time)
recommend(cart)        → rank co-occurring items by pair/item confidence, exclude cart items
                       → validate vs RAG catalog (#3) → phrase a cross-sell line (Ollama)
bundle(cart)           → seed + top add-on + a small bundle discount offer
```

- **Deterministic core:** item-to-item co-occurrence with a confidence score; works immediately and improves as real co-purchases are recorded.
- **Catalog-validated:** suggestions are checked against the RAG catalog (#3) so you never recommend something you don't stock.
- **AI only phrases** the line; no model → clean template ("You might also like: ...").
- **Zero new npm dependencies.**

## Files

- `lib/upsell/upsellEngine.js` — recommend / bundle / recordPurchase / stats.
- `routes/upsellRoutes.js` — self-mountable router.
- `tests/smoke/upsellSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/upsell', require('./routes/upsellRoutes'));
```

## Environment

```
UPSELL_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/upsell/recommend` | Add-on suggestions + cross-sell line. Body: `{ items:[names], k? }` |
| POST | `/api/upsell/bundle` | Seed + top add-on as a discounted bundle. Body: `{ items:[], discountPct? }` |
| POST | `/api/upsell/purchase` | Record a completed purchase to learn from. Body: `{ items:[] }` |
| GET | `/api/upsell/stats` | Learned items + pairs |
| GET | `/api/upsell/health` | Brain + catalog wiring |

### Example

```bash
curl -X POST http://localhost:3000/api/upsell/recommend \
  -H 'Content-Type: application/json' -d '{"items":["phone"]}'
# -> { recommendations:[{name:"phone case", score:0.8}, ...], message:"Grab a case with that? ..." }
```

## Wiring into the order flow

1. **Learn:** when an order confirms (order extraction #25), call `recordPurchase({ items })`. Co-occurrence sharpens over time.
2. **Suggest:** while an order is forming (or right after add-to-cart), call `recommend({ items: cart })` and send `message` to the customer.
3. **Bundle:** for a stronger push, `bundle({ items: cart })` offers the add-on at a small discount.
4. Pairs naturally with order extraction (#25) and cart recovery (#31): recover the cart, then lift it.

## Tests

```bash
node tests/smoke/upsellSmoke.js
```
