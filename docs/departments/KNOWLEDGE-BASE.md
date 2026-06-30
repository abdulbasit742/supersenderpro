# Feature #61 — Knowledge Base

A searchable help center: author articles (how-tos, policies, FAQs), publish them, and serve a
ranked keyword search the **AI auto-reply (#14)** uses to ground its answers — and a public help
widget can query directly.

## Why
The AI responder (#14) had a small FAQ list, and support (#3) answers the same questions over and
over. A proper knowledge base lets you write the answer once, in real article form, and have both
the AI and customers pull from it. Better answers, less repeat work, and a self-serve help center.

## What it does
- **Author articles:** `create({ title, body, category, tags, status })` with a
  `draft -> published -> archived` workflow. Only **published** articles appear in search.
- **Ranked search (no dependency):** `search(query)` scores articles by query-term overlap with
  **term-frequency**, **field boosts** (title 3x, tags 2.5x, body 1x), and an **idf-ish rarity**
  weight so distinctive words matter more. Returns title + category + a **snippet** centered on the
  match + a score. Tokenizer drops stopwords (English + a little Roman-Urdu) and short tokens.
- **View tracking:** published-article reads can bump a view counter (for a help widget).
- **Filters:** list by status / category / tag; category index.

## Files
- `lib/knowledgeBase/config.js` — env posture (search limit, min score)
- `lib/knowledgeBase/store.js` — atomic JSON store (`data/knowledge-base.json`)
- `lib/knowledgeBase/tokenize.js` — dependency-free tokenizer + stopwords
- `lib/knowledgeBase/search.js` — ranked TF + field-boost + idf search + snippets
- `lib/knowledgeBase/articleStore.js` — article CRUD + publish/archive + views
- `lib/knowledgeBase/doctor.js` — offline self-check + posture
- `lib/knowledgeBase/index.js` — barrel
- `routes/knowledgeBaseRoutes.js` — REST surface (`/api/kb`)
- `scripts/knowledge-base-check.js`, `tests/smoke/knowledgeBaseSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const knowledgeBaseRoutes = require('./routes/knowledgeBaseRoutes');
app.use('/api/kb', knowledgeBaseRoutes);   // /search + published GETs are public-safe; gate authoring
```
Ground the AI auto-reply (#14) with KB hits before answering:
```js
const kb = require('./lib/knowledgeBase');
const hits = kb.search(incomingMessage);            // top published articles
if (hits.length) { /* pass hits[0].snippet as grounding context to the responder */ }
```
A help widget can hit `GET /api/kb/search?q=...` and `GET /api/kb/articles/:id?countView=true`.

## Endpoints (`/api/kb`)
- `GET /status`, `GET /doctor`, `GET /categories`
- `GET /search?q=&limit=` — ranked published search
- `POST /articles` `{ title, body, category, tags, status? }`, `GET /articles` (`?status=&category=&tag=`)
- `GET /articles/:id?countView=true`, `PUT /articles/:id`
- `POST /articles/:id/publish`, `POST /articles/:id/archive`

## Safety
JSON-backed; **PII-free** (help content, not customer data). Search defaults to published-only.
Articles archived, never hard-deleted. This module never sends. 100% additive; no existing
module/route/data changed, no new dependency (search is hand-rolled).

## Env
```
KB_ENABLED=true
KB_SEARCH_LIMIT=5
KB_MIN_SCORE=0.05
```

## Verify
```bash
for f in lib/knowledgeBase/*.js; do node --check "$f"; done
node --check routes/knowledgeBaseRoutes.js
npm run knowledge-base:check
npm run knowledge-base:smoke
```

Feature #61 done. Agle number ka intezaar.
