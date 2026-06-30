# AI Media Studio (self-hosted ComfyUI)

Turn a prompt (or a product) into **WhatsApp-ready images**: product shots, marketing creatives, and stickers. Generation runs on your **self-hosted ComfyUI** GPU box (PC #2, the Linux video/batch machine) — zero cloud cost, on-prem, runs 24/7 on your A6000s.

## Why

A WhatsApp commerce SaaS lives on visuals: product images, promo creatives, fun stickers to drive engagement. Doing this on local GPUs means unlimited generation at zero marginal cost instead of paying per-image to a cloud API.

## Architecture

```
generate({ prompt | product, type }) → build ComfyUI txt2img graph
   → POST /prompt (queue) → poll /history → GET /view (image bytes)
   → save to data/generated_media/<id>.png → job log
```

Three style presets: `product` (clean studio shot), `marketing` (bold ad creative), `sticker` (die-cut kawaii). Each preset sets a prompt suffix + sensible dimensions.

**Graceful fallback:** if ComfyUI is unreachable, the studio writes a placeholder SVG and marks the job `fallback` — the API never hard-fails, so the rest of the app keeps working while the GPU box is offline.

**Zero new npm dependencies** (Node built-ins + global `fetch`).

## Files

- `lib/mediaStudio/comfyClient.js` — minimal ComfyUI HTTP client + txt2img graph builder.
- `lib/mediaStudio/mediaStudio.js` — high-level generate / jobs / health, output storage.
- `routes/mediaStudioRoutes.js` — self-mountable Express router.
- `tests/smoke/mediaStudioSmoke.js` — offline smoke test (no GPU needed).

## Wiring it up (one line in server.js)

```js
app.use('/api/media-studio', require('./routes/mediaStudioRoutes'));
```

## Environment

Point at the ComfyUI box (PC #2):

```
COMFYUI_HOST=http://<pc2-ip>:8188
COMFYUI_MODEL=sd_xl_base_1.0.safetensors
```

(Start ComfyUI on PC #2 with `--listen` so the SuperSender host can reach it over the LAN.)

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/media-studio/generate` | Generate an image. Body: `{ prompt? , product?{name,description}, type?, steps?, width?, height? }` |
| GET | `/api/media-studio/jobs` | List recent jobs |
| GET | `/api/media-studio/jobs/:id` | Get one job |
| GET | `/api/media-studio/file/:name` | Serve the generated image |
| GET | `/api/media-studio/health` | ComfyUI reachability + model |

### Example

```bash
curl -X POST http://localhost:3000/api/media-studio/generate \
  -H 'Content-Type: application/json' \
  -d '{"type":"product","product":{"name":"Wireless Earbuds","description":"matte black, noise cancelling"}}'
# -> { success:true, status:"done", url:"/api/media-studio/file/<id>.png", ... }
```

## Sending a generated image over WhatsApp

`generate()` returns a local `file` (under `data/generated_media/`) and a `url`. In the WhatsApp engine, read that file and send it as media (whatsapp-web.js `MessageMedia` / Baileys image message). Typical flow: customer asks to "see the product" → generate a `product` image → send it inline.

## Tests

```bash
node tests/smoke/mediaStudioSmoke.js
```
