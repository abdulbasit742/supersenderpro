# AI Payment-Screenshot Confirmation

In this market most non-COD orders are paid by **JazzCash / Easypaisa / bank transfer**, and the customer proves it by sending a **screenshot**. Eyeballing those by hand is slow and easy to fake. This reads the receipt with a self-hosted vision model (Ollama `llava`), extracts the **amount + transaction id + method + date**, then **deterministically verifies** it against the expected order amount and **blocks reused/duplicate transaction IDs**. Zero cloud cost; receipts never leave your machines.

## Why

Payment confirmation is a daily bottleneck and a fraud surface: customers send the wrong amount, an old screenshot, or someone else\'s receipt. Automating the read + check means instant confirmation for legit payments and an automatic catch for the rest, without a human squinting at every screenshot.

## Safety: the decision is code, not the model

The vision model only does OCR (reads the numbers) and the reply phrasing. The accept/reject decision is **pure deterministic code**:
- the paid amount must be within a tolerance of the expected order amount, and
- the transaction id must not already exist in the ledger (no reusing one screenshot for two orders).

So a doctored or recycled screenshot can\'t talk its way past the amount check or a duplicate txn id.

## How it works

```
setExpected(orderId, amount)            # at checkout
customer sends screenshot -> ocrReceipt (Ollama llava) -> { amount, txnId, method, date }
verify:
   no amount read            -> unreadable (ask to resend)
   txnId already in ledger    -> duplicate (blocked)
   amount within tolerance    -> verified  (record txn; non-COD success signal)
   amount off                 -> amount_mismatch (ask to check/resend)
   no expected on file        -> manual_review
```

**Zero new npm dependencies** (global `fetch`; reuses `multer` for uploads).

## Files

- `lib/payments/paymentConfirm.js` — expect / OCR / verify / ledger.
- `routes/paymentRoutes.js` — self-mountable router.
- `tests/smoke/paymentConfirmSmoke.js` — offline smoke test + tolerance/duplicate guards.

## Wiring it up (one line in server.js)

```js
app.use('/api/payment-confirm', require('./routes/paymentRoutes'));
```

## Environment

```
OLLAMA_HOST=http://127.0.0.1:11434
VISION_MODEL=llava:13b           # ollama pull llava:13b
PAYMENT_TOLERANCE_PCT=1          # accept paid amount within ±this % of expected
ORDER_CURRENCY=PKR
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/payment-confirm/expect` | Set the expected amount for an order. Body: `{ orderId, amount, phone? }` |
| POST | `/api/payment-confirm/verify` | Verify a screenshot. Image via multipart `image`, `imageBase64`, or `path`; + `{ phone?, orderId?, expectedAmount? }` |
| GET | `/api/payment-confirm/txns` | List recorded transactions (filter by decision/phone) |
| GET | `/api/payment-confirm/txn/:txnId` | One transaction |
| GET | `/api/payment-confirm/health` | Vision reachability + tolerance |

### Example

```bash
curl -X POST localhost:3000/api/payment-confirm/expect -H 'Content-Type: application/json' -d '{"orderId":"O123","amount":2500,"phone":"+92300xxxxxxx"}'
curl -X POST localhost:3000/api/payment-confirm/verify -F image=@receipt.jpg -F orderId=O123 -F phone=+92300xxxxxxx
# -> { decision:"verified", paid:2500, txnId:"JC123ABC", method:"jazzcash", reply:"\u2705 Payment of PKR 2500 confirmed..." }
```

## Wiring into the flow

1. At checkout (order extraction #25), call `setExpected({ orderId, amount, phone })`.
2. When an inbound message is an image and the customer is mid-payment, download the media and call `verifyScreenshot({ buffer, phone, orderId })`; send `reply`.
3. On `verified`, advance the order (and the delivery tracker #70 to `dispatched`); on `amount_mismatch` / `duplicate`, the reply already asks the customer to fix it; `manual_review` routes to a human (team inbox #74).
4. Verified payments feed fraud-risk (#58) as a positive signal.

## Tests

```bash
node tests/smoke/paymentConfirmSmoke.js
```
