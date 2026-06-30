# AI Review & Feedback Collector

After an order completes, the right follow-up turns a happy customer into a **public review** and an unhappy one into a **saved relationship** — if you route them correctly. This asks for feedback post-purchase, reads the reply\'s sentiment + star rating, and routes: **happy → nudge to your public review link; unhappy → private human escalation** (so complaints get fixed, not posted). Positive replies are distilled into clean testimonials. All on self-hosted Ollama; zero cloud cost.

## Why

Reviews are social proof = sales, but blasting everyone to "leave a review" also sends your unhappy customers to your public rating. **Sentiment-gated routing** is the trick: only happy customers are pointed at the public link; unhappy ones get a private "let us make it right". You grow ratings and recover at-risk customers at the same time.

## How it works

```
order confirmed (#25) → requestReview() schedules an ask (timed via send-time #21)
   → customer replies → classify (rating + sentiment, deterministic)
      → happy   → reply with public review link + store a testimonial
      → unhappy → private apology + escalate to a human (no public push)
      → neutral → thank them
```

- **Deterministic classification** (star parse + pos/neg lexicon incl. Roman Urdu) means routing works with no model.
- **AI only polishes** the testimonial quote + ask copy.
- **Testimonials** are stored for your site/marketing (filter by min rating).
- **Zero new npm dependencies.**

## Files

- `lib/reviews/reviewCollector.js` — request / classify / route / testimonial / stats.
- `routes/reviewRoutes.js` — self-mountable router.
- `tests/smoke/reviewCollectorSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/reviews', require('./routes/reviewRoutes'));
```

## Environment

```
REVIEW_MODEL=qwen2.5:32b            # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
REVIEW_LINK=https://g.page/r/your-google-review-link
REVIEW_ASK_DELAY_HOURS=24           # how long after purchase to ask
REVIEW_HAPPY_THRESHOLD=4            # >= this many stars = happy
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/reviews/request` | Schedule a post-purchase ask. Body: `{ phone, orderId?, delayHours? }` |
| POST | `/api/reviews/reply` | Ingest a reply → classify + route. Body: `{ phone, text }` |
| GET | `/api/reviews/testimonials?minRating=4` | Collected testimonials |
| GET | `/api/reviews/stats` | Response rate, happy/unhappy, avg rating |
| GET | `/api/reviews/health` | Brain + link + send-time wiring |

### Example

```bash
# after order confirm, schedule the ask
curl -X POST localhost:3000/api/reviews/request -H 'Content-Type: application/json' -d '{"phone":"+92300xxxxxxx","orderId":"o_123"}'
# when they reply, route it
curl -X POST localhost:3000/api/reviews/reply -H 'Content-Type: application/json' -d '{"phone":"+92300xxxxxxx","text":"5/5 amazing, fast delivery!"}'
# -> { verdict:"happy", action:"route_to_public_review", reply:"... review link ...", testimonial:{quote:"..."} }
```

## Wiring into the flow

1. When order extraction (#25) confirms an order, call `requestReview({ phone, orderId })` and enqueue the ask at its `whenISO` (BullMQ delay).
2. When the customer replies to the ask, run `ingestReply({ phone, text })` and send back `reply`.
3. If `shouldEscalate`, route to a human (pairs with the support agent escalation / agent copilot #9).
4. Pull `GET /testimonials` into your landing page / catalog for social proof.

## Tests

```bash
node tests/smoke/reviewCollectorSmoke.js
```
