# AI Conversational Lead Qualification

A flood of inbound leads is useless if you can\'t tell the tyre-kickers from the buyers. This qualifies a lead through a short guided chat — capturing **NEED, BUDGET, TIMELINE, and AUTHORITY** (a BANT-style frame) — then scores fit **0-100** and routes: high-fit leads get handed to a human (team inbox #74) immediately; the rest go to nurture. Self-hosted Ollama; zero cloud cost.

## Why

Your time (and your agents\') is the scarce resource. Talking to every \"how much?\" the same way wastes it. A 4-question qualifier sorts a hot wholesale buyer (\"50 units, today, for my business\") from a casual browser in under a minute, so humans only touch the leads worth touching, and the rest drop into automated nurture (#62) / win-back (#36).

## How it works

```
start(phone)              -> first qualifying question (NEED)
answer(phone, text)       -> score the answer -> next question -> ... -> complete
   need / budget / timeline / authority, each scored deterministically
score 0-100 + band (hot/warm/cool/cold)
   score >= hotThreshold  -> route to a human now (team inbox #74)
   else                   -> nurture
-> pushes a buying-intent signal to lead-intel (#11)
```

- **Deterministic flow + scoring** (strong signals: specific need, a real budget number, \"today/urgent\", \"for my business\" score high; vague/\"just exploring\" score low). Works with no model.
- **AI is optional polish:** it rephrases each question to sound natural; offline, the questions are asked verbatim.
- Configurable questions + hot threshold.
- **Zero new npm dependencies.**

## Files

- `lib/leadQualify/leadQualify.js` — start / answer / score / sessions.
- `routes/leadQualifyRoutes.js` — self-mountable router.
- `tests/smoke/leadQualifySmoke.js` — offline smoke test + scoring checks.

## Wiring it up (one line in server.js)

```js
app.use('/api/lead-qualify', require('./routes/leadQualifyRoutes'));
```

## Environment / config

```
QUALIFY_MODEL=qwen2.5:32b   # only to rephrase questions; defaults to SUPPORT_AGENT_MODEL
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune the questions + `hotThreshold` via `PUT /api/lead-qualify/config`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/lead-qualify/start` | Begin qualification. Body: `{ phone }` |
| POST | `/api/lead-qualify/answer` | Submit an answer. Body: `{ phone, text }` |
| GET | `/api/lead-qualify/session?phone=` | Current session + answers |
| GET | `/api/lead-qualify/list?band=hot` | Qualified leads (sorted by score) |
| GET/PUT | `/api/lead-qualify/config` | Read / tune questions + threshold |
| GET | `/api/lead-qualify/health` | Brain status |

### Example

```bash
curl -X POST localhost:3000/api/lead-qualify/start -H 'Content-Type: application/json' -d '{"phone":"+92300xxxxxxx"}'
curl -X POST localhost:3000/api/lead-qualify/answer -H 'Content-Type: application/json' -d '{"phone":"+92300xxxxxxx","text":"50 units for my shop, today"}'
# ... after the last answer:
# -> { done:true, score:86, band:"hot", hot:true, message:"... connecting you with someone ..." }
```

## Wiring into the flow

1. When the support agent (#1) sees a fresh sales-intent lead (intent router #17 = sales), `start({ phone })` and send the first question.
2. Route the lead\'s subsequent replies to `answer({ phone, text })` while the qualification session is active.
3. On completion, if `hot`, assign to a human via the team inbox (#74); otherwise enroll in a nurture drip (#62). Either way the buying-intent signal lands in lead-intel (#11) and Customer 360 (#48).

## Tests

```bash
node tests/smoke/leadQualifySmoke.js
```
