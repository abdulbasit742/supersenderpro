# The SuperSender AI Suite

A self-hosted AI layer for WhatsApp commerce, every feature running on your own GPUs (Ollama + local STT/TTS/vision), zero cloud cost, on-prem privacy. Each feature shipped as an independent, self-mountable router; this doc is the index + the one-line way to wire them all.

## The features

| # | Feature | Mount path | What it does |
| --- | --- | --- | --- |
| 1 | Conversational Support Agent | `/api/support-agent` | 24/7 Q&A, order-taking, human escalation |
| 3 | RAG Knowledge Base | `/api/knowledge-base` | Semantic answers from your docs/FAQs/catalog (local embeddings) |
| 5 | AI Media Studio | `/api/media-studio` | Product/marketing/sticker images (ComfyUI) |
| 7 | Voice-Note AI (STT) | `/api/voice-note` | Transcribe customer voice notes (Whisper) |
| 9 | Agent Copilot | `/api/agent-copilot` | Reply drafts, summaries, tone rewrites for human agents |
| 11 | Lead Intelligence | `/api/lead-intel` | 0-100 lead scoring + next-best-action (overnight batch) |
| 13 | Campaign Copywriter | `/api/campaign-copy` | Broadcast copy, A/B variants, anti-ban lint |
| 15 | Real-Time Translation | `/api/translation` | 2-way chat translation |
| 17 | Intent Router + Tagging | `/api/intent-router` | Classify, tag, and route every message |
| 19 | Analytics Copilot | `/api/analytics-copilot` | Ask your data in plain English/Urdu |
| 21 | Smart Send-Time | `/api/send-time` | Per-contact best send hour + anti-ban spread |
| 23 | Image Product Search | `/api/vision-search` | Photo -> catalog match (local vision) |
| 25 | Order Extraction | `/api/order-extraction` | Free text -> structured, confirmable order |
| 27 | Self-Improving FAQ Trainer | `/api/faq-trainer` | Mine escalations -> new FAQs (human-approved) |
| 29 | Daily Owner Briefing | `/api/ai-briefing` | One morning digest across the suite |
| 31 | Cart Recovery | `/api/cart-recovery` | Win back stalled orders with a timed cadence |
| 33 | Safety Guardrails | `/api/guardrails` | Prompt-injection defense, PII redaction, moderation |
| 35 | Voice Replies (TTS) | `/api/voice-reply` | Bot answers with a spoken voice note |
| 36 | Dormant Win-Back | `/api/winback` | Re-engage quiet customers, segmented by reason |
| 37 | Local LLM Ops | `/api/llm-ops` | Health, metrics, cloud failover, keep-warm |
| 38 | Review Collector | `/api/reviews` | Sentiment-gated reviews + testimonial extraction |
| 40 | Upsell Recommender | `/api/upsell` | Co-purchase add-on suggestions |
| 42 | NL Segment Builder | `/api/segments` | Describe an audience -> a real list |
| 44 | Broadcast Analyzer | `/api/broadcast-analyzer` | Grade a campaign, explain why, recommend next |
| 46 | Appointment Booking | `/api/booking` | Parse request, offer slots, confirm + remind |
| 48 | Customer 360 | `/api/customer-360` | Unified per-contact profile + AI summary |
| 50 | Inbound Pipeline (capstone) | `/api/inbound` | Runs a message through the whole suite |
| 52 | AI Suite Control Panel | `/api/ai-suite` | One-line mounter + unified health + dashboard |

(Agent Copilot #9 mounts at `/api/agent-copilot`; it predates this registry and can be added to the registry list if desired.)

## Wire the whole suite in one line

Instead of ~25 `app.use` lines, in `server.js`:

```js
const app = require('express')();
// ... your existing setup ...

require('./lib/aiSuite/aiSuite').mountAll(app);              // mounts every installed feature
app.use('/api/ai-suite', require('./routes/aiSuiteRoutes')); // health + control panel
```

`mountAll` is **best-effort**: features whose files aren't present (PR not merged yet) are simply skipped and reported, so this is safe no matter which subset you've merged.

Prefer explicit mounts? Run `node scripts/wire-ai-suite.js --explicit` to print the individual lines for installed features.

## Live control panel

Open **`/api/ai-suite/panel`** in a browser: a zero-dependency dashboard that polls the health aggregator every 30s and shows each feature green (installed + healthy), red (installed but unreachable, e.g. Ollama down), or grey (not installed), with expandable details (model, reachability, counts).

## Unified health endpoint

```bash
curl localhost:3000/api/ai-suite/health
# -> { total:27, installed:27, up:25, features:[{id,label,path,installed,ok,detail}, ...] }
```

Great for uptime monitoring (#37 covers the model box specifically; this covers the whole suite).

## Environment (self-hosted defaults)

```
OLLAMA_HOST=http://127.0.0.1:11434
SUPPORT_AGENT_MODEL=qwen2.5:32b     OLLAMA_KEEP_ALIVE=-1
RAG_EMBED_MODEL=nomic-embed-text    # ollama pull nomic-embed-text
WHISPER_HOST=http://<gpu>:8000      VISION_MODEL=llava:13b
TTS_HOST=http://<gpu>:8001          AGENT_LANGUAGE=en
LLM_FAILOVER_PROVIDERS=groq,openai  # cloud fallback only
```

## Design principles (every feature follows these)

- **Self-hosted first:** all generation routes through the AI Brain Bridge (Ollama); cloud is fallback only.
- **Graceful degradation:** every feature has a deterministic core that works with no model; the LLM only enriches.
- **Zero new npm dependencies:** Node built-ins + global `fetch` + what was already in `package.json`.
- **Did not touch `server.js`:** all features are additive, self-mountable routers + `lib/` modules.
- **Offline smoke tests:** every feature ships a `tests/smoke/*Smoke.js` that runs with no model.
- **File-backed now, DB-ready later:** stores live under `data/`, consistent with the repo, clean to swap to Postgres in Phase 1.

## Tests

```bash
node tests/smoke/aiSuiteSmoke.js
# or run them all:
for f in tests/smoke/*Smoke.js; do node "$f" || exit 1; done
```
