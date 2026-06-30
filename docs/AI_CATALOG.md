# AI Catalog Manager

Most WhatsApp sellers keep their products in their head, not in a clean catalog. This turns **raw input** (\"red kurta 1500 cotton\") into a proper entry — a polished description, a category, search tags, and a normalized price — via self-hosted Ollama, then stores it and **auto-ingests it into the RAG knowledge base (#3)**, so the support agent (#1), image search (#23), upsell (#40) and order extraction (#25) instantly know the product. Zero cloud cost.

## Why

A good catalog is the backbone every commerce feature reads from: the agent answers \"do you have X / what\'s the price\", vision search matches photos, upsell recommends add-ons, order extraction validates items. But typing clean entries is tedious. This makes adding a product as easy as forwarding a line of text, and keeps the RAG store in sync automatically.

## How it works

```
raw input -> enrich (Ollama): { name, description, category, tags, price }  [deterministic fallback]
          -> store (dedupe by name) -> auto-ingest into RAG (#3)
```

- **AI enrichment** writes the description + tags + category; if the model is offline, a deterministic builder parses the price, guesses the category, and extracts tags so you still get a usable row.
- **Auto RAG sync:** every add re-ingests the product into the knowledge base, so retrieval-based features see it immediately.
- **Dedupe:** same product name updates the existing entry rather than duplicating.
- **Zero new npm dependencies.**

## Files

- `lib/catalog/catalogManager.js` — enrich / add / bulk / list / sync-rag.
- `routes/catalogRoutes.js` — self-mountable router.
- `tests/smoke/catalogSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/catalog', require('./routes/catalogRoutes'));
```

## Environment

```
CATALOG_MODEL=qwen2.5:32b    # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/catalog/enrich` | Preview a clean entry from raw input (no store). Body: `{ name?, raw, price? }` |
| POST | `/api/catalog/add` | Enrich + store + RAG sync. Body: `{ name?, raw, price?, inStock?, syncRag? }` |
| POST | `/api/catalog/bulk` | Add many. Body: `{ items:[string\|{name,raw,price}] }` |
| GET | `/api/catalog/list?category=` | List products |
| GET | `/api/catalog/product/:name` | One product |
| DELETE | `/api/catalog/product/:name` | Remove a product |
| POST | `/api/catalog/sync-rag` | Re-ingest the whole catalog into RAG |
| GET | `/api/catalog/health` | Brain + RAG wiring |

### Example

```bash
curl -X POST localhost:3000/api/catalog/add \
  -H 'Content-Type: application/json' \
  -d '{"raw":"red kurta soft cotton summer 1500"}'
# -> { product:{ name:"Red Kurta", description:"...", category:"apparel", tags:[...], price:1500 }, rag:{ ingested:true } }
```

## Wiring into the flow

1. Add products via `add` / `bulk` (forward a few lines of text, or paste a list). Each one auto-syncs to RAG (#3).
2. The support agent (#1), vision search (#23), upsell (#40) and order extraction (#25) read the catalog through RAG — no extra wiring.
3. After enabling embeddings (`ollama pull nomic-embed-text`), run `sync-rag` once to re-embed the whole catalog.

## Tests

```bash
node tests/smoke/catalogSmoke.js
```
