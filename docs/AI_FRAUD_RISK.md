# AI Order Fraud + COD-Risk Scorer

Cash-on-delivery is huge in this market — and so is its pain: fake orders, refusals, and return-to-origin (RTO) that eats your shipping cost. This scores each order\'s risk **0-100 before you fulfill**, recommends an action (**approve / verify / require-advance / hold**), and when verification helps, the AI phrases a polite confirm message. Self-hosted Ollama; zero cloud cost.

## Why

One bad COD order costs you two-way shipping + repackaging. A flat "prepaid only" policy kills conversions in a COD-first market. Risk scoring is the middle path: approve the safe majority instantly, and only add friction (verify / advance) where the signals actually warrant it, so you cut RTO without losing good customers.

## Safety + explainability

The score is a **pure deterministic function** — every point has a reason string. The model is used **only** to phrase the verification message, never to decide the score or action. So the policy is auditable and stable, and you can tune the thresholds yourself.

## Signals scored

- New vs known customer; trusted history (multiple delivered, zero returns) lowers risk.
- Prior RTO / returns and cancellations (raise risk).
- Order value vs your high-value threshold.
- Delivery address completeness (weighted for COD).
- Velocity / burst (many orders in a short window).
- Suspicious / disposable-looking phone number.
- At-risk lead flag from lead-intel (#11).
- COD vs prepaid (prepaid lowers risk).

## How it works

```
order -> deterministic score 0-100 (+ reasons) -> action by threshold:
   < verifyAbove        approve
   >= verifyAbove       verify (ask for full address / delivery time)
   >= requireAdvanceAbove require_advance (ask for partial prepayment)
   >= holdAbove         hold (manual review)
-> AI phrases the verification message (Ollama)  [template fallback]
-> recordOutcome(delivered|returned|cancelled) feeds back into per-contact history
```

**Zero new npm dependencies.**

## Files

- `lib/fraudRisk/fraudRisk.js` — score / assess / recordOutcome / stats / config.
- `routes/fraudRiskRoutes.js` — self-mountable router.
- `tests/smoke/fraudRiskSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/fraud-risk', require('./routes/fraudRiskRoutes'));
```

## Environment / config

```
FRAUD_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune thresholds via `PUT /api/fraud-risk/config` (`verifyAbove`, `requireAdvanceAbove`, `holdAbove`, `highValueThreshold`, `burstWindowMins`, `burstCount`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/fraud-risk/assess` | Score an order. Body: `{ order:{ phone, value?, address?, paymentMethod? } }` |
| POST | `/api/fraud-risk/outcome` | Record real outcome. Body: `{ phone, outcome:'delivered'\|'returned'\|'cancelled' }` |
| GET | `/api/fraud-risk/stats` | Orders / delivered / returned / RTO rate |
| GET/PUT | `/api/fraud-risk/config` | Read / tune thresholds |
| GET | `/api/fraud-risk/health` | Brain status |

### Example

```bash
curl -X POST http://localhost:3000/api/fraud-risk/assess \
  -H 'Content-Type: application/json' \
  -d '{"order":{"phone":"+92300xxxxxxx","value":15000,"address":"lhr","paymentMethod":"cod"}}'
# -> { score:72, band:"elevated", action:"require_advance", reasons:[...], message:"To confirm your order we kindly ask..." }
```

## Wiring into checkout

1. When order extraction (#25) produces a confirmable order, call `assess({ order })` before fulfillment.
2. `approve` -> proceed; `verify`/`require_advance` -> send `message` and wait; `hold` -> route to a human (pairs with the agent copilot #9).
3. After delivery/return, call `recordOutcome({ phone, outcome })` so the model of each customer sharpens (RTO history is the strongest signal).
4. Feeds Customer 360 (#48) and lead-intel (#11) with reliability signal over time.

## Tests

```bash
node tests/smoke/fraudRiskSmoke.js
```
