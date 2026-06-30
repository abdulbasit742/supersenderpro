# WhatsApp Number Health + Ban-Risk Monitor

The whole business rides on your WhatsApp number staying alive. WhatsApp bans numbers that ramp volume too fast, get blocked/reported, or message people who never engage. This tracks per-number activity, scores **ban-risk 0-100**, and — most usefully — recommends a **safe daily send cap** (account-age-aware warmup), so you can grow volume without getting nuked. Self-hosted Ollama; zero cloud cost.

## Why

A banned number = the business is offline and every customer thread is gone. The two biggest causes are **ramping too fast on a young number** and **high block/opt-out with low engagement**. This makes both visible and enforces a safe cap, the cheapest insurance you can have.

## How it works

```
register(number, createdAt)         -> sets the account-age clock
event(number, sent|delivered|read|replied|blocked|optOut) -> daily counters
riskScore(): age + today\'s volume vs warmup cap + block rate + opt-out rate + reply rate
   -> 0-100 (low | moderate | high | critical) with reasons
dailyCap = warmup ramp interpolated by account age
canSend(number, n) -> hard gate: false if critical or n would exceed today\'s cap
status(number) -> score + cap + AI-phrased advisory  [template fallback]
```

Default warmup ramp: 50/day (new) → 250 (1wk) → 600 (2wk) → 1,500 (1mo) → 5,000 (2mo) → 10,000 (3mo+). Fully configurable.

- **Deterministic scoring + caps**; the LLM only phrases the advisory line.
- **Zero new npm dependencies.**

## Files

- `lib/numberHealth/numberHealth.js` — register / event / riskScore / canSend / status.
- `routes/numberHealthRoutes.js` — self-mountable router.
- `scripts/number-health-report.js` — daily report (cron-ready).
- `tests/smoke/numberHealthSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/number-health', require('./routes/numberHealthRoutes'));
```

## Environment / config

```
NUMBER_HEALTH_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune via `PUT /api/number-health/config` (`warmup` ramp, `maxBlockRate`, `maxOptOutRate`, `minReplyRate`, `riskHoldAbove`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/number-health/register` | Register a number + age. Body: `{ number, createdAt? }` |
| POST | `/api/number-health/event` | Record an event. Body: `{ number, type, count? }` |
| GET | `/api/number-health/status?number=` | Risk + cap + advisory |
| GET | `/api/number-health/can-send?number=&count=` | Hard send gate |
| GET | `/api/number-health/list` | All numbers by risk |
| GET/PUT | `/api/number-health/config` | Read / tune thresholds |
| GET | `/api/number-health/health` | Brain status |

### Example

```bash
curl 'localhost:3000/api/number-health/can-send?number=+92300xxxxxxx&count=200'
# -> { allowed:false, remainingToday:50, dailyCap:250, band:"moderate", reason:"would exceed safe daily cap" }
```

## Wiring into broadcasts (the important part)

Make `can-send` a **pre-flight gate** on every broadcast batch:

1. Before sending a batch from a number, call `canSend({ number, count: batchSize })`. If not allowed, hold the rest for tomorrow (or split across numbers).
2. On webhooks, feed `event({ number, type })` for delivered/read/replied, and crucially `blocked` / `optOut` so risk reflects reality.
3. Pair with the send-time optimizer (#21) `maxPerSlot` spread and the copywriter (#13) spam lint, this monitor is the volume/health guardrail those two feed into.
4. Surface `list` in the daily owner briefing (#29) so a number creeping toward critical is caught early.

## Tests

```bash
node tests/smoke/numberHealthSmoke.js
```
