# AI Shipping & COD Fee Calculator + ETA Estimator (#97)

Gives every WhatsApp customer an instant, accurate **shipping cost + cash-on-delivery fee + delivery ETA** the moment they share a city/address, weight, and payment choice. The self-hosted Ollama model only *phrases* the reply warmly in the customer's language; **every rupee is computed by deterministic code** so quotes are always correct and never hallucinated.

## Why it pairs well
- **#25 Order Extraction** feeds it the cart (items → weight, subtotal).
- **#70 Delivery Tracking** continues the journey after the order ships.
- **#86 Payment Screenshot Confirmation** + **#58 COD Risk** decide prepaid vs COD; this prices each.
- **#1 Support Agent** can call it inline to answer “kitna shipping lagega?” instantly.

## Design guarantees
- **Deterministic core** – the model never picks a price. It only re-words pre-computed numbers, and we fall back to a template if the figure is missing.
- **Zero new npm deps** – Node built-ins only.
- **server.js untouched** – mount via `routes/shippingRoutes.js`.
- **Per-store config** – `data/shipping/<storeId>.json` lets each tenant tune zones, rates, COD, and free-shipping threshold without code.
- **Offline smoke test** – `node tests/smoke/shippingSmoke.js` passes with no model.

## Rate model
- **Zones**: local / regional / national / remote, each with `base + perKg` and an ETA window. Cities map to zones; unknown cities default to national.
- **Weight** is rounded up to the next 0.5 kg.
- **COD**: flat + % of order value, blocked above `maxOrderValue` or when disabled.
- **Free shipping** at/above `freeShippingThreshold` (COD surcharge still applies).
- **Weekend buffer**: orders placed Sat/Sun add configurable days to ETA.

## Mounting
```js
const shipping = require('./routes/shippingRoutes');
app.use('/ai/shipping', shipping);
```

## API
| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/ai/shipping/quote` | `{ city, weightKg, subtotal, payment, lang?, reply? }` | `{ quote, message }` |
| GET | `/ai/shipping/config` | – | `{ config }` |
| PUT | `/ai/shipping/config` | partial rate card | `{ config }` |

Store is selected via `x-store-id` header or `storeId` in body/query. Set `reply:false` for a numbers-only quote (no LLM call).

### Example
```bash
curl -X POST localhost:3000/ai/shipping/quote \
  -H 'x-store-id: acme' -H 'content-type: application/json' \
  -d '{"city":"Karachi","weightKg":0.7,"subtotal":1200,"payment":"cod","lang":"Roman Urdu"}'
```
