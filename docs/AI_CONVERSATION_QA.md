# AI Conversation QA Scorer (Feature #100)

Scores bot + human WhatsApp conversations for quality using a **deterministic rubric**. Works with **no model**; optional self-hosted Ollama (qwen2.5:32b) adds Roman-Urdu coaching tips with graceful fallback.

## Why
You can't improve support you don't measure. This grades every conversation (A-F), predicts CSAT (1-5), and tells agents exactly what to fix.

## Rubric (weighted 0-100)
| Dimension | Weight | What it measures |
|---|---|---|
| Response time | 30% | Median agent/bot reply latency to customer (<=30s = 100, >=10min = 0) |
| Resolution | 30% | Did the last customer message signal it was solved? |
| Tone | 20% | Politeness lexicon (please/thanks/shukriya) minus rude tokens |
| Escalation | 20% | If customer asked for a human, did an agent step in? |

Overall maps to grade (A>=85, B>=70, C>=55, D>=40, F<40) and predicted CSAT (1-5).

## Conversation shape
```json
{
  "id": "c-123",
  "tenantId": "t1",
  "messages": [
    { "role": "customer", "text": "kya available hai?", "ts": 1730000000000 },
    { "role": "bot", "text": "Ji please, available hai.", "ts": 1730000010000 }
  ]
}
```
`role` is one of `customer` | `agent` | `bot`. `ts` is epoch ms (used for latency).

## API
Mount in `server.js`:
```js
app.use('/api/conversation-qa', require('./routes/conversationQARoutes'));
```

- `POST /api/conversation-qa/score` - deterministic score only (no model)
- `POST /api/conversation-qa/score-and-coach` - score + optional Ollama coaching, persists
- `GET  /api/conversation-qa/scores?tenantId=&minOverall=&grade=` - list stored scores
- `GET  /api/conversation-qa/aggregate?tenantId=` - team/tenant rollup (avg score, avg CSAT, grade distribution)

### Options (body for score-and-coach)
- `useModel: false` - skip Ollama, use deterministic tips
- `persist: false` - don't write to data store

## Storage
File-backed at `data/conversationQA/scores.json`. No DB, no new deps.

## Self-hosted AI
Coaching tips use `ai/aiBrain.processPrompt` (Ollama qwen2.5:32b by default). If the model is down, deterministic tips are returned automatically. Cloud is fallback-only.

## Test
```bash
node tests/smoke/conversationQASmoke.js
```
Fully offline. Passes with no model running.
