# RAG Knowledge Base (self-hosted local embeddings)

Gives the AI a real **knowledge base** instead of a static FAQ list. Ingest docs, FAQs, and your product catalog; at answer time the system embeds the customer's question and retrieves the most relevant chunks (semantic search), which the support agent injects into its prompt. Runs entirely on your **self-hosted Ollama** GPU box, so embeddings cost nothing and customer data never leaves your machines.

## Why this matters

The support agent (feature #1) was limited to whatever FAQs you hand-wrote into its prompt. With RAG it can answer from your full knowledge base, scale to hundreds of docs/products, and stay accurate ("only answer from retrieved knowledge") instead of hallucinating.

## Architecture

```
ingest(text/faqs/products) → chunk → embed (Ollama /api/embeddings, nomic-embed-text)
                                       ↓
                            data/knowledge_base/<store>_vectors.json

query → embed → cosine top-k → retrieved context → injected into agent prompt
```

**Graceful degradation:** if the embed model isn't pulled or Ollama is down, the store keeps the raw text and search falls back to deterministic keyword-overlap scoring. You always get an answer, just less semantically sharp until embeddings are available.

**Zero new dependencies** (Node built-ins + global `fetch`).

## Files

- `ai/knowledgeBase/ragStore.js` — vector store: ingest, chunk, embed, cosine search, stats.
- `ai/knowledgeBase/supportAgentRag.js` — helper that returns a ready-to-inject context block.
- `routes/knowledgeBaseRoutes.js` — self-mountable Express router.
- `tests/smoke/ragStoreSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/knowledge-base', require('./routes/knowledgeBaseRoutes'));
```

## Environment

```
OLLAMA_HOST=http://127.0.0.1:11434
RAG_EMBED_MODEL=nomic-embed-text
```

Pull the embedding model once on the GPU box:

```bash
ollama pull nomic-embed-text
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/knowledge-base/ingest` | Ingest free text. Body: `{ storeId?, title?, text, source? }` |
| POST | `/api/knowledge-base/ingest/faqs` | Ingest `[{q,a}]` |
| POST | `/api/knowledge-base/ingest/products` | Ingest a product catalog |
| GET | `/api/knowledge-base/search?q=...` | Semantic top-k search |
| GET | `/api/knowledge-base/stats` | Chunk counts + model + dim |
| DELETE | `/api/knowledge-base?source=faq` | Clear all, or one source |
| GET | `/api/knowledge-base/health` | Ollama embeddings reachability |

### Example

```bash
curl -X POST http://localhost:3000/api/knowledge-base/ingest/faqs \
  -H 'Content-Type: application/json' \
  -d '{"faqs":[{"q":"Delivery time?","a":"Instant after payment."}]}'

curl 'http://localhost:3000/api/knowledge-base/search?q=how%20fast%20is%20delivery'
```

## Wiring RAG into the support agent (feature #1)

In `ai/agents/supportAgent.js`, before building the prompt, pull retrieved context and prepend it:

```js
const { getContext } = require('../knowledgeBase/supportAgentRag');

// inside handleMessage, before buildPrompt:
const { context } = await getContext(storeId, message, { k: 4 });
// then include `context` near the top of the prompt (above FAQs), e.g.:
//   const prompt = (context ? context + '\n\n' : '') + buildPrompt(kb, thread, message, language);
```

That single change turns the agent's static FAQ answers into full knowledge-base retrieval. (Left as an opt-in edit so it can land independently of the support-agent PR.)

## Tests

```bash
node tests/smoke/ragStoreSmoke.js
```
