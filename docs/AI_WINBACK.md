# AI Dormant-Customer Win-Back

Cart recovery (#31) chases a stalled order. **This chases people who simply went quiet** — no contact in N days. It finds the dormant set, segments them by likely reason, and crafts a tailored re-engagement message per segment via self-hosted Ollama. Send-time aware (#21) and suppression-aware, so you reactivate sleeping customers without pestering anyone. Zero cloud cost.

## Why

Your cheapest growth isn't new leads, it's the customers you already earned who drifted away. A well-segmented, well-timed nudge brings a chunk of them back for free. Doing it by reason (at-risk vs. price-sensitive vs. lapsed buyer) makes the message actually land.

## How it works

```
lead-intel store (#11) → findDormant (last contact ≥ WINBACK_DORMANT_DAYS)
   → segment by reason: at_risk | lapsed_buyer | price_sensitive | never_purchased | general
   → craft one message per segment (Ollama) → time via send-time (#21)
   → plan (status queued, attempt++) → queue worker sends → mark sent/won/suppress
```

- **Reason-based segments** drive tone + incentive (empathetic for at-risk, soft offer for price-sensitive, "what's new" for lapsed buyers).
- **Suppression:** after `WINBACK_MAX_ATTEMPTS` with no response, the contact is exhausted, never spammed again. `won`/`suppressed` are excluded from future scans.
- **Send-time aware:** each message is timed to the contact's best hour when the optimizer (#21) is present.
- **Graceful fallback:** no model → clean per-segment templates.
- **Zero new npm dependencies.**

## Files

- `lib/winback/winback.js` — findDormant / segment / craft / launch / outcomes.
- `routes/winbackRoutes.js` — self-mountable router.
- `scripts/winback-batch.js` — weekly batch runnable (cron-ready).
- `tests/smoke/winbackSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/winback', require('./routes/winbackRoutes'));
```

## Weekly batch on PC #2

```bash
# Monday 4am: build a win-back plan from dormant customers
0 4 * * 1  cd /path/to/supersenderpro && node scripts/winback-batch.js >> data/winback/batch.log 2>&1
```

The batch PLANS only. A worker takes the plan, sends each at its `whenISO` (BullMQ delay, `lib/queueManager.js`), then calls `POST /api/winback/sent`. When a contact replies, call `/won`; the support agent / lead-intel signals will naturally move them out of the dormant set too.

## Environment

```
WINBACK_MODEL=qwen2.5:32b        # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
WINBACK_DORMANT_DAYS=21          # quiet for this many days = dormant
WINBACK_MAX_ATTEMPTS=2           # stop after this many nudges
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/winback/dormant` | List dormant customers + segment counts |
| POST | `/api/winback/draft` | Draft one segment's message. Body: `{ segment, incentive? }` |
| POST | `/api/winback/launch` | Build a win-back plan. Body: `{ dormantDays?, max?, incentiveBySegment? }` |
| POST | `/api/winback/sent` | Mark a contact's nudge sent. Body: `{ phone }` |
| POST | `/api/winback/won` | Mark recovered (stops further nudges). Body: `{ phone }` |
| POST | `/api/winback/suppress` | Never contact again. Body: `{ phone }` |
| GET | `/api/winback/health` | Brain + send-time wiring |

### Example

```bash
curl -X POST http://localhost:3000/api/winback/launch \
  -H 'Content-Type: application/json' \
  -d '{"dormantDays":21,"incentiveBySegment":{"price_sensitive":"10% off code BACK10"}}'
# -> { dormant: 38, queued: 38, segments: {price_sensitive:12, at_risk:6, ...}, plan:[...] }
```

## Tests

```bash
node tests/smoke/winbackSmoke.js
```
