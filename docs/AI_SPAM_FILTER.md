# AI Inbound Spam & Abuse Filter

Protects your number health and team inbox by classifying every inbound
message **before** it reaches an agent or triggers an auto-reply.

## Why
A few abusive/scam/spam inbound messages can get a WhatsApp number flagged
or banned, and they waste agent time. This filter screens inbound traffic
with a deterministic core (works with **no model**) and an **optional**
self-hosted Ollama tie-break for borderline cases.

## What it does
- Classifies text into `clean | spam | scam | abuse`.
- Recommends an action: `allow | quarantine | block`.
- Uses lexicons + heuristics: scam/spam/abuse term lists, link count,
  ALL-CAPS ratio, repeated chars/words.
- Optional AI tie-break **only** for borderline scores (25-55), with
  graceful fallback when Ollama is unreachable.
- Tenant-scoped, file-backed counters under `data/spamFilter/<tenant>.json`.
- Captures human feedback for later tuning.

## Mount
```js
app.use('/api/spam-filter', require('./routes/spamFilterRoutes'));
```
No new npm deps. Uses Express + Node built-ins + existing `ai/aiBrain`.

## API
| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/spam-filter/classify` | Classify text (no persistence). Body: `{ text, useAi? }` |
| POST | `/api/spam-filter/check` | Classify + persist counters. Tenant via `x-tenant-id`/body. |
| POST | `/api/spam-filter/feedback` | Record human outcome `{ text, predicted, actual, action }` |
| GET | `/api/spam-filter/stats` | Tenant stats: counts, flagged rate |
| GET | `/api/spam-filter/config` | Labels/actions/config |
| GET | `/api/spam-filter/health` | Health probe |

### Example
```bash
curl -X POST localhost:3000/api/spam-filter/check \
  -H 'content-type: application/json' \
  -H 'x-tenant-id: acme' \
  -d '{"text":"CONGRATS you WON! send OTP to claim prize"}'
# -> { ok:true, result:{ label:'scam', score:..., action:'block', reasons:[...] } }
```

## Suggested wiring
Call `/check` from your inbound webhook. If `action === 'block'`, drop the
message; if `quarantine`, route to a review queue (pairs well with the Team
Inbox feature); if `allow`, proceed to your normal bot/agent pipeline.

## Tuning
- Edit the `SCAM_TERMS`, `SPAM_TERMS`, `ABUSE_TERMS` lexicons in
  `lib/spamFilter/spamFilter.js`.
- Use `/feedback` to log false positives/negatives, then adjust thresholds
  in `recommendAction`.

## Test
```bash
node tests/smoke/spamFilterSmoke.js
```
Runs fully offline (forces AI fallback).
