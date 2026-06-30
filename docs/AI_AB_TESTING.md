# AI A/B Testing Engine

The copywriter (#13) makes variants and the broadcast analyzer (#44) grades a finished send. **This is the missing middle: run a real experiment.** Create N variants, assign each contact to one (stable, even split), track impressions + conversions, and declare a winner **only when the result is statistically sound** — so you never crown a winner on noise. Self-hosted Ollama; zero cloud cost.

## Why

\"Variant A got more replies\" is meaningless if it was 11 vs 9. Real A/B testing needs a stable split and a significance test. This gives you both: a deterministic hash assignment (so a contact always sees the same variant) and a two-proportion z-test that tells you the confidence the leader is actually better, gated behind a minimum sample size.

## How it works

```
create(id, variants[], minSamplePerVariant, confidenceThreshold)
assign(id, contact)        -> stable hash(experiment+contact) % N  (even split, sticky)
recordImpression / recordConversion(id, variantId)
results(id):
   per-variant rate, leader, lift over runner-up,
   two-proportion z-test confidence the leader != runner-up,
   canDeclareWinner = minSampleMet AND confidence >= threshold
conclude(id) -> locks the winner (auto only if significant)
```

- **Deterministic stats** (z-test via normal CDF); the model only phrases the verdict.
- **Sticky assignment:** same contact always gets the same variant (no contamination).
- **Guarded conclusion:** auto-declare refuses until min sample + confidence are met.
- **Zero new npm dependencies.**

## Files

- `lib/abTest/abTest.js` — create / assign / record / results / conclude.
- `routes/abTestRoutes.js` — self-mountable router.
- `tests/smoke/abTestSmoke.js` — offline smoke test + significance checks.

## Wiring it up (one line in server.js)

```js
app.use('/api/ab-test', require('./routes/abTestRoutes'));
```

## Environment

```
ABTEST_MODEL=qwen2.5:32b   # only for the verdict line; defaults to SUPPORT_AGENT_MODEL
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/ab-test/create` | Create an experiment. Body: `{ id, variants:[{label,content?}], minSamplePerVariant?, confidenceThreshold? }` |
| GET | `/api/ab-test/assign?id=&contact=` | Sticky variant assignment for a contact |
| POST | `/api/ab-test/impression` | Record an impression. Body: `{ id, variantId }` |
| POST | `/api/ab-test/convert` | Record a conversion. Body: `{ id, variantId }` |
| GET | `/api/ab-test/results?id=` | Rates, lift, confidence, can-declare + AI verdict |
| POST | `/api/ab-test/conclude` | Lock the winner (auto if significant). Body: `{ id, winnerId? }` |
| GET | `/api/ab-test/list` | List experiments |
| GET | `/api/ab-test/health` | Brain status |

### Example

```bash
curl -X POST localhost:3000/api/ab-test/create -H 'Content-Type: application/json' -d '{"id":"eid-subject","variants":[{"label":"A","content":"Eid sale \ud83c\udf89"},{"label":"B","content":"20% off today"}]}'
# per recipient at send time:
curl 'localhost:3000/api/ab-test/assign?id=eid-subject&contact=+92300xxxxxxx'  # -> variant to send
# then record outcomes; check the winner:
curl 'localhost:3000/api/ab-test/results?id=eid-subject'
# -> { leader:"A", confidence:0.97, lift:25.0, canDeclareWinner:true, message:"A is winning..." }
```

## Wiring into broadcasts

1. Generate variants with the copywriter (#13), `create` an experiment from them.
2. At send time, for each recipient call `assign({ id, contact })` and send that variant. Record an `impression`.
3. On the conversion event (reply / order / click), call `convert({ id, variantId })`.
4. Watch `results`; once `canDeclareWinner`, `conclude` and use the winner as the default going forward. The broadcast analyzer (#44) grades the overall send; this picks the variant.

## Tests

```bash
node tests/smoke/abTestSmoke.js
```
