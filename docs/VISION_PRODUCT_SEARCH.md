# Image Product Search (self-hosted vision)

A customer sends a **photo** on WhatsApp — "do you have this?" — and the bot finds the closest products in your catalog. A self-hosted vision model (Ollama: `llava` / `qwen2-vl`) describes the image into structured tags, which are matched against the RAG product catalog. All on your A6000s — zero cloud cost, on-prem.

## Why

People shop by picture. They screenshot a product, snap a competitor's item, or photograph what they want, and expect you to know it. Visual search turns "do you have this?" photos into instant catalog matches, a delight moment most WhatsApp shops can't do.

## Architecture

```
photo → vision model (Ollama /api/generate, llava) → { category, color, attributes, keywords }
      → build query → RAG/catalog match → closest products
```

**Layered + safe:** vision is the enrichment, not a hard dependency.
- Vision offline → returns a clean "type the product name" path.
- Any text hint the customer also typed is matched directly.
- Catalog matching reuses the RAG store (feature #3); if RAG is absent it degrades gracefully.

**Zero new npm dependencies** (global `fetch`; reuses `multer` for multipart).

## Files

- `lib/visionSearch/visionSearch.js` — describe image + match catalog + search.
- `routes/visionSearchRoutes.js` — self-mountable router.
- `tests/smoke/visionSearchSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/vision-search', require('./routes/visionSearchRoutes'));
```

## Environment

```
OLLAMA_HOST=http://127.0.0.1:11434
VISION_MODEL=llava:13b        # or qwen2-vl; pull on the GPU box: ollama pull llava:13b
```

The catalog comes from the RAG knowledge base, ingest products there:

```bash
curl -X POST http://localhost:3000/api/knowledge-base/ingest/products \
  -H 'Content-Type: application/json' \
  -d '{"products":[{"name":"Red Leather Formal Shoes","description":"mens red leather","price":4999}]}'
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/vision-search/search` | Image (+ optional `hint`) → product matches |
| POST | `/api/vision-search/describe` | Image → structured tags only |
| GET | `/api/vision-search/health` | Vision reachability + RAG wiring |

Image as multipart `image`, JSON `imageBase64`, or server-local `path`.

### Example

```bash
curl -X POST http://localhost:3000/api/vision-search/search \
  -F image=@customer_photo.jpg -F phone=+92300xxxxxxx
# -> { matches:[{title:"Red Leather Formal Shoes",...}], answer:"Found 1 matching item: ...", source:"vision" }
```

## Wiring into live WhatsApp inbound

When an inbound message is an image:

1. Download the media buffer (`msg.downloadMedia()` / Baileys `downloadMediaMessage`).
2. Call `require('./lib/visionSearch/visionSearch').searchByImage({ storeId, buffer, hint: msg.caption, phone })`.
3. Reply with `result.answer`; if `result.matches` has items, send their names/prices (and optionally a generated product image via the Media Studio).
4. No match → the answer already asks for a keyword or offers a manual stock check.

## Tests

```bash
node tests/smoke/visionSearchSmoke.js
```
