# Analytics Copilot (ask your data in plain language)

Ask business questions in plain **English or Urdu** — "how many hot leads this week?", "kitni sales hui?", "any at-risk customers?" — and get a real answer computed from actual data. Runs on your **self-hosted Ollama**; zero cloud cost, on-prem.

## Why

Dashboards make you hunt for numbers. As a time-strapped founder you'd rather just *ask*. This turns the whole product's data into a chat you can query in one line.

## Safety-first design (no code-exec, no SQL injection)

The model **never writes code or SQL**. Instead the system exposes a registry of vetted, deterministic **metric functions**. The AI is used only to:
1. map the question → a metric id, and
2. phrase the computed number into a sentence.

Every actual computation is plain JS over data you already hold. If the model is offline, it falls back to keyword metric matching + a templated answer. This is the safe pattern for "talk to your data" (vs. letting an LLM emit raw queries).

## Architecture

```
question → match metric (keyword; AI for ambiguous) → run vetted metric fn (deterministic)
         → phrase answer (Ollama, optional) → { answer, value, detail, metricId }
```

## Built-in metrics

Read the other features' stores when present (degrade to 0 if absent): hot-leads count, leads-by-band, at-risk count, top next-best-actions, media generations, voice notes processed. **Pluggable:** register your own with `registerMetric({ id, description, keywords, run })`.

**Zero new npm dependencies.**

## Files

- `lib/analyticsCopilot/analyticsCopilot.js` — registry + ask + built-in metrics.
- `routes/analyticsCopilotRoutes.js` — self-mountable router.
- `tests/smoke/analyticsCopilotSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/analytics-copilot', require('./routes/analyticsCopilotRoutes'));
```

## Environment

```
ANALYTICS_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/analytics-copilot/ask` | Ask in natural language. Body: `{ question, storeId? }` |
| GET | `/api/analytics-copilot/metrics` | List available metrics |
| GET | `/api/analytics-copilot/health` | Brain status + metric count |

### Example

```bash
curl -X POST http://localhost:3000/api/analytics-copilot/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"how many hot leads do we have right now?"}'
# -> { answer:"You currently have 7 hot leads.", metricId:"hot_leads_count", value:7, ... }
```

## Registering your own metric

```js
const copilot = require('./lib/analyticsCopilot/analyticsCopilot');
copilot.registerMetric({
  id: 'revenue_this_month',
  description: 'Total revenue this month',
  keywords: ['revenue', 'sales', 'kitni sales', 'earnings'],
  run: (_args, ctx) => ({ value: computeRevenue(ctx.storeId), unit: 'PKR' })
});
```

This is how you connect real orders/billing once the Postgres migration lands: add a metric that queries the DB, the copilot picks it up automatically.

## Tests

```bash
node tests/smoke/analyticsCopilotSmoke.js
```
