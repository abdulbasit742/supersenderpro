# AI Broadcast Performance Analyzer

After a campaign goes out, this turns raw counts into an answer: **how did it do, WHY, and what should the next one be.** It computes the funnel, grades the campaign 0-100 against benchmarks, detects issues (high opt-out, low read, weak CTA, no conversion), compares against your rolling history, and has the AI write a plain-language verdict + the single best next action. Self-hosted Ollama; zero cloud cost.

## Why

Most shops see "sent 1000, delivered 950" and stop there. The money is in the WHY: was the hook weak, the timing wrong, the CTA missing, the list fatigued? This closes the loop, every broadcast teaches you how to make the next one better.

## How it works

```
campaign metrics → funnel rates (delivered/read/reply/convert/opt-out)
   → grade 0-100 vs benchmarks (− opt-out penalty)
   → detect issues → compare vs rolling history
   → AI verdict + NEXT recommendation (Ollama)  [deterministic fallback]
```

- **Deterministic core:** funnel + grade + issue detection need no model and are fully explainable.
- **AI layer** writes the human verdict and the next-campaign recommendation.
- **Rolling history** so a campaign is judged against your own norms, not just generic benchmarks.
- **Zero new npm dependencies.**

## Files

- `lib/broadcastAnalyzer/broadcastAnalyzer.js` — analyze / history / compare.
- `routes/broadcastAnalyzerRoutes.js` — self-mountable router.
- `tests/smoke/broadcastAnalyzerSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/broadcast-analyzer', require('./routes/broadcastAnalyzerRoutes'));
```

## Environment

```
BROADCAST_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/broadcast-analyzer/analyze` | Score a campaign. Body: `{ name?, metrics:{sent,delivered,read,replied,converted,optOuts}, messageText? }` |
| GET | `/api/broadcast-analyzer/history?limit=30` | Past analyses |
| GET | `/api/broadcast-analyzer/compare?limit=10` | Best / worst / average grade |
| GET | `/api/broadcast-analyzer/health` | Brain + benchmarks |

### Example

```bash
curl -X POST http://localhost:3000/api/broadcast-analyzer/analyze \
  -H 'Content-Type: application/json' \
  -d '{"name":"Eid Sale","metrics":{"sent":1000,"delivered":950,"read":600,"replied":80,"converted":20,"optOuts":10}}'
# -> { grade:{score:72,band:"good"}, issues:[], verdict:"...\nNEXT: ...", funnel:{...} }
```

## Wiring into broadcasts (wati campaigns)

The existing `routes/wati.js` already tracks delivered/read status and campaign stats. After a campaign finishes:

1. Pull its counts (`getCampaignDetails`) into `{ sent, delivered, read, replied, converted, optOuts }`.
2. Call `analyze({ name, metrics, messageText })`.
3. Show the `grade` + `verdict` in the dashboard; surface `NEXT` as the recommended action.
4. Feed the recommendation back into the campaign copywriter (#13) for the next send. Closes the create → send → measure → improve loop.

## Tests

```bash
node tests/smoke/broadcastAnalyzerSmoke.js
```
