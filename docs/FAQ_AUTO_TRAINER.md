# Self-Improving FAQ Trainer

The support agent (#1) escalates or fumbles questions it can't answer — those are exactly the FAQs you're missing. This **mines recent customer questions** (especially escalated / unanswered ones), clusters the recurring ones, drafts candidate FAQ Q/A pairs with the AI, dedupes them against your existing knowledge base, and **queues them for human approval**. Approve one and it's ingested into the RAG knowledge base (#3) so the agent answers it automatically next time. The bot literally gets smarter every night. All on your **self-hosted Ollama**.

## Why

Most "AI support" is static, it never learns from the questions it failed. This closes the loop: every escalation becomes a candidate FAQ, so coverage compounds and escalations drop over time, with a human always in the approval seat (no garbage auto-published).

## The loop

```
chats → harvest questions (esp. escalated) → cluster recurring ones
      → AI drafts FAQ Q/A (Ollama) → dedupe vs RAG → PENDING candidate
      → human approves (edits if needed) → ingest into RAG (#3)
      → agent answers it automatically next time
```

- **Human-in-the-loop:** candidates are never auto-published; approval is a deliberate step, and approve is blocked until there's an answer.
- **Deterministic clustering** means it still surfaces recurring questions with no model (just without polished phrasing).
- **Dedupe:** anything already well-covered in RAG (similarity >= 0.75) is skipped.
- Built to run as an **overnight batch on PC #2**. **Zero new npm dependencies.**

## Files

- `lib/faqTrainer/faqTrainer.js` — harvest / cluster / draft / approve / reject.
- `routes/faqTrainerRoutes.js` — self-mountable router.
- `scripts/faq-trainer-batch.js` — nightly batch runnable (cron-ready).
- `tests/smoke/faqTrainerSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/faq-trainer', require('./routes/faqTrainerRoutes'));
```

## Overnight batch on PC #2

```bash
# nightly at 3am: mine escalated chats from the last 14 days
0 3 * * *  cd /path/to/supersenderpro && node scripts/faq-trainer-batch.js --days 14 --escalated >> data/faq_trainer/batch.log 2>&1
```

Each morning, review `data/faq_trainer/<store>_last_batch.json` or hit `/api/faq-trainer/candidates`, approve the good ones, done.

## Environment

```
FAQ_TRAINER_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/faq-trainer/mine` | Mine chats → candidates. Body: `{ onlyEscalated?, sinceDays?, minClusterSize? }` |
| GET | `/api/faq-trainer/candidates?status=pending` | Review queue |
| POST | `/api/faq-trainer/approve` | Approve (+ optional edits) → ingest. Body: `{ id, q?, a? }` |
| POST | `/api/faq-trainer/reject` | Reject. Body: `{ id }` |
| GET | `/api/faq-trainer/health` | Brain + RAG wiring |

### Example

```bash
# mine, review, approve
curl -X POST localhost:3000/api/faq-trainer/mine -H 'Content-Type: application/json' -d '{"onlyEscalated":true,"sinceDays":14}'
curl 'localhost:3000/api/faq-trainer/candidates'
curl -X POST localhost:3000/api/faq-trainer/approve -H 'Content-Type: application/json' -d '{"id":"<id>","a":"Usually 2-3 working days."}'
```

## Tests

```bash
node tests/smoke/faqTrainerSmoke.js
```
