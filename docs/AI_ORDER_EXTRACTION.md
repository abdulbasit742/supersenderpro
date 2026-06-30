# AI Order Extraction (chat → structured order)

Customers don't fill forms on WhatsApp — they type *"2 red shirts size M, deliver to Lahore, cash on delivery"*. This turns that free text into a **structured, confirmable order**: items (name, qty, color, size), delivery address, payment method, contact — plus a clean confirmation summary and a list of anything still missing. Runs on your **self-hosted Ollama**; zero cloud cost.

## Why

Manually re-keying chat messages into orders is slow and error-prone, and it's where sales leak. Auto-extraction means the moment a customer describes what they want, you have a ready-to-confirm order, and a precise prompt for whatever's missing ("what's your address?").

## How it works

```
free text → AI extract to STRICT JSON (Ollama)  ─or─  deterministic regex fallback
          → validate items vs RAG catalog (canonical name + price)
          → confirmation summary + missing-fields list → draft order (per contact)
          → customer replies CONFIRM → confirmOrder() → hand off to fulfillment
```

- **AI + fallback:** the model emits strict JSON; if it's offline a regex parser still captures items, city, and payment so no order is lost.
- **Catalog validation:** items are matched against the RAG product catalog (feature #3) for canonical names + pricing and a computed total. Degrades gracefully if RAG is absent.
- **Draft → confirm flow:** drafts are stored per contact; `confirm` refuses to proceed while required fields are missing.
- **Zero new npm dependencies.**

## Files

- `lib/orderExtraction/orderExtractor.js` — extract / validate / summarize / confirm.
- `routes/orderExtractionRoutes.js` — self-mountable router.
- `tests/smoke/orderExtractionSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/order-extraction', require('./routes/orderExtractionRoutes'));
```

## Environment

```
ORDER_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/order-extraction/extract` | Free text → draft order. Body: `{ phone?, text }` |
| POST | `/api/order-extraction/confirm` | Confirm a contact's draft. Body: `{ phone }` |
| GET | `/api/order-extraction/draft/:phone` | Current draft |
| GET | `/api/order-extraction/drafts?status=` | List drafts |
| GET | `/api/order-extraction/health` | Brain + RAG wiring |

### Example

```bash
curl -X POST http://localhost:3000/api/order-extraction/extract \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx","text":"2 red shirts size M, deliver to Lahore, COD"}'
# -> { order:{items:[...],address:"Lahore",payment:"cod"}, summary:"\ud83d\uded2 Order summary...", missing:[], total:... }
```

## Wiring into the chat + checkout

1. When the support agent (#1) detects order intent (or always, on inbound), call `extractOrder({ phone, text })`.
2. Send `summary` back to the customer. If `missing` is non-empty, ask for exactly those fields.
3. When the customer replies "CONFIRM", call `confirmOrder({ phone })` and pass the returned `order` to your existing fulfillment / `txnStore` / payment flow.
4. Pricing/canonical names come from the RAG catalog (#3); pair with the chat-out checkout link in `lib/competitorParity.js` if you want a pay link.

## Tests

```bash
node tests/smoke/orderExtractionSmoke.js
```
