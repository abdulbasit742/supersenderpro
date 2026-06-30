# Local LLM Ops (health, metrics, failover, keep-warm)

The entire AI suite runs on one self-hosted Ollama box (PC #1). If it stalls, the model gets evicted from VRAM, or the eduroam proxy flakes, everything degrades at once. This is the **ops layer** that watches it and keeps it honest:

- **Health/status:** is Ollama reachable, which models are loaded (warm), is the primary model resident.
- **Metrics:** per-call latency / tokens / provider / success, with p50/p95 and failover-rate rollups.
- **Auto-failover:** `callWithFailover()` tries **local first**, then walks your configured cloud providers, so a local outage never takes the bot down.
- **Keep-warm:** a periodic touch keeps the model loaded (pairs with `OLLAMA_KEEP_ALIVE=-1`) so first-token latency stays low.

All on-prem, file-backed, zero new npm dependencies.

## Why

Self-hosting is the whole cost advantage, but it means YOU own uptime. This gives you the three things self-hosting needs: visibility (is it up + fast?), resilience (fail over to cloud only when local dies), and warmth (no cold-start lag on the first customer message of the hour).

## How failover works

```
callWithFailover(prompt) → try ollama (local)
   → success? return it (provider: 'ollama', fellBack: false)
   → fail? walk LLM_FAILOVER_PROVIDERS (e.g. groq, openai) via the AI Brain Bridge
   → record metrics for every attempt; mark fellBack=true once local fails
```

The cloud providers are exactly the ones the AI Brain Bridge already supports; they stay the fallback, not the default, so cost stays at zero in normal operation.

## Files

- `lib/llmOps/llmOps.js` — status / metrics / callWithFailover / keepWarm / record.
- `routes/llmOpsRoutes.js` — self-mountable router.
- `scripts/llm-keepwarm.js` — cron runnable to keep the model resident.
- `tests/smoke/llmOpsSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/llm-ops', require('./routes/llmOpsRoutes'));
```

## Environment

```
OLLAMA_HOST=http://127.0.0.1:11434
SUPPORT_AGENT_MODEL=qwen2.5:32b      # treated as the primary model
LLM_FAILOVER_PROVIDERS=groq,openai   # tried in order only when local fails
OLLAMA_KEEP_ALIVE=-1                  # keep model resident
```

## Keep-warm cron (PC #1)

```bash
*/5 * * * *  cd /path/to/supersenderpro && node scripts/llm-keepwarm.js >> data/llm_ops/keepwarm.log 2>&1
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/llm-ops/status` | Ollama reachability + loaded/available models |
| GET | `/api/llm-ops/metrics?sinceHours=24` | Call volume, success/failover rate, p50/p95 latency, tokens |
| POST | `/api/llm-ops/warm` | Force a keep-warm touch. Body: `{ model? }` |
| POST | `/api/llm-ops/generate` | Failover-aware generate. Body: `{ prompt, model?, providers? }` |
| GET | `/api/llm-ops/health` | Summary status |

### Example

```bash
curl localhost:3000/api/llm-ops/metrics?sinceHours=24
# -> { calls:412, successRate:0.99, failoverRate:0.01, latencyMs:{p50:820,p95:2100}, byProvider:{ollama:408,groq:4} }
```

## Using failover in the suite

Anywhere you call the model directly, you can route through `callWithFailover` instead to get resilience + metrics for free:

```js
const ops = require('./lib/llmOps/llmOps');
const { text, provider, fellBack } = await ops.callWithFailover(prompt);
```

Or just keep using the AI Brain Bridge and call `ops.record(...)` after your own calls to feed the metrics dashboard.

## Tests

```bash
node tests/smoke/llmOpsSmoke.js
```
