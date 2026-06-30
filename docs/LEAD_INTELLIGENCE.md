# AI Lead Intelligence + Next-Best-Action

Scores every WhatsApp lead **0-100** from real conversation signals, sorts them hot → warm → cold, flags at-risk customers, and (optionally) attaches an AI **summary + next-best-action** for each. Built to run as an **overnight batch on PC #2** (the Linux GPU box) so every morning opens with a ranked lead list. All on-prem, zero cloud cost.

## Why

The support agent talks to everyone; this tells the human team **who to chase first** and **what to do next**. That's the difference between a busy inbox and actual revenue.

## Two layers

1. **Deterministic score** — always on, explainable, cheap. Recency + frequency + buying-intent + urgency signals, minus an at-risk penalty for refund/complaint/negative language. Every score ships with its `reasons`.
2. **AI enrichment** — a one-line summary + a concrete next-best-action, generated via the AI Brain Bridge (self-hosted Ollama). Optional; if the model is offline you still get the deterministic score.

## Architecture

```
lead (phone) → pull chat history (support agent store)
   → deriveSignals → scoreSignals (0-100, band, reasons)
   → [optional] enrich via Ollama → { summary, nextBestAction }
   → data/lead_intel/<store>_scores.json
```

Conversation history comes from the support agent's store when present; you can also pass explicit `signals` (e.g. from your CRM). **Zero new npm dependencies.**

## Files

- `lib/leadIntel/leadIntel.js` — scoring + enrichment + batch.
- `routes/leadIntelRoutes.js` — self-mountable router.
- `scripts/lead-intel-batch.js` — standalone nightly batch runnable.
- `tests/smoke/leadIntelSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/lead-intel', require('./routes/leadIntelRoutes'));
```

## Overnight batch on PC #2

Run the warm-model batch nightly via cron:

```bash
# every night at 2am
0 2 * * *  cd /path/to/supersenderpro && node scripts/lead-intel-batch.js >> data/lead_intel/batch.log 2>&1
```

It writes `data/lead_intel/<store>_last_batch.json` (totals + top 20 with next-best-actions). Use `--no-ai` for a fast deterministic-only pass, or `--store <id>` for a specific store.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/lead-intel/score` | Score one lead. Body: `{ phone, signals?, enrichAI? }` |
| POST | `/api/lead-intel/batch` | Batch-score `{ leads? }` (or everyone on file) |
| GET | `/api/lead-intel/top?band=hot&limit=20` | Ranked leads |
| GET | `/api/lead-intel/lead/:phone` | One scored lead |
| GET | `/api/lead-intel/health` | Brain + wiring status |

### Example

```bash
curl 'http://localhost:3000/api/lead-intel/top?band=hot&limit=10'
# -> ranked hot leads with score, reasons, summary, nextBestAction
```

## Environment

```
LEAD_INTEL_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## Tests

```bash
node tests/smoke/leadIntelSmoke.js
```
