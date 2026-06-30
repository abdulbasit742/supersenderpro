# AI Returns & Refund (RMA) Handler

Returns are inevitable; handling them well — fast, fair, and on-policy — keeps customers without bleeding margin. This opens a return request, checks eligibility against an **owner-set policy** (return window, eligible reasons, non-returnable items, restocking fee), **auto-decides within the rules** or routes edge cases to a human, and tracks the full RMA lifecycle. Self-hosted Ollama; zero cloud cost.

## Why

A slow or unfair returns experience is how you lose a customer for good; an instant, clearly-explained decision (even a denial) keeps trust. Auto-approving the clear-cut cases (wrong item, defective-with-photo) frees your team to only touch the judgement calls.

## Safety: decisions are policy-bound

Eligibility is a **pure deterministic function**. It can **never** auto-approve a return that is out-of-window or for a non-returnable item, and discretionary reasons (change-of-mind) always route to a human. The model only phrases the customer reply, never decides the outcome. The smoke test covers out-of-window, non-returnable, photo-required, and restocking-fee paths.

## How it works

```
openReturn(reason, deliveredAt, product, hasPhoto) -> decideEligibility (policy):
   non-returnable / out-of-window / ineligible reason -> DENY
   damage/defect without photo                        -> REVIEW (needs proof)
   change-of-mind / discretionary                     -> REVIEW (refund minus restocking fee)
   wrong_item / defective(+photo) / damaged / not_as_described -> AUTO-APPROVE
-> RMA lifecycle: requested -> approved -> received -> refunded   (or denied / review)
-> on refund: record return outcome to fraud-risk (#58) + reverse loyalty points (#60)
```

**Zero new npm dependencies.**

## Files

- `lib/returns/returnsEngine.js` — policy / openReturn / decide / receive / refund.
- `routes/returnsRoutes.js` — self-mountable router.
- `tests/smoke/returnsSmoke.js` — offline smoke test + policy-guard checks.

## Wiring it up (one line in server.js)

```js
app.use('/api/returns', require('./routes/returnsRoutes'));
```

## Set your policy

```bash
curl -X PUT localhost:3000/api/returns/policy -H 'Content-Type: application/json' -d '{
  "windowDays": 7,
  "autoApproveReasons": ["defective","wrong_item","damaged","not_as_described"],
  "reviewReasons": ["changed_mind"],
  "nonReturnable": ["gift card","clearance item"],
  "restockingFeePct": 10,
  "requirePhotoForDamage": true
}'
```

## Environment

```
RETURNS_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/returns/open` | Open + instant decision. Body: `{ phone, reason, product?, deliveredAt?, hasPhoto?, value? }` |
| POST | `/api/returns/decide` | Human decision on a review RMA. Body: `{ rmaId, decision, refundPct? }` |
| POST | `/api/returns/received` | Mark returned item received. Body: `{ rmaId }` |
| POST | `/api/returns/refund` | Process the refund. Body: `{ rmaId }` |
| GET | `/api/returns/rma/:rmaId` | RMA record |
| GET | `/api/returns/list` | List RMAs (filter by status/phone) |
| GET | `/api/returns/stats` | Counts by status |
| GET/PUT | `/api/returns/policy` | Read / set the returns policy |
| GET | `/api/returns/health` | Brain + cross-feature wiring |

### Example

```bash
curl -X POST localhost:3000/api/returns/open -H 'Content-Type: application/json' -d '{"phone":"+92300xxxxxxx","product":"Blue Shirt","reason":"wrong_item","deliveredAt":"2026-06-28","value":2000}'
# -> { rmaId:"RMA1A2B3C4D", decision:"approve", refundPct:100, status:"approved", reply:"\u2705 Your return is approved..." }
```

## Wiring into the flow

1. When the support agent (#1) detects a return/refund request, extract `{ reason, product }` and call `openReturn` (use the delivery date from delivery tracking #70 as `deliveredAt`).
2. Send `reply`; if `status` is `review`, the agent copilot (#9) helps the human decide, then `POST /decide`.
3. On the physical return arriving, `POST /received` then `POST /refund`.
4. Refund auto-records the return to fraud-risk (#58) and reverses loyalty points (#60).

## Tests

```bash
node tests/smoke/returnsSmoke.js
```
