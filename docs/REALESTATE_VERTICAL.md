# Real-Estate Vertical (SuperSender Pro)

Turns SuperSender from a generic broadcast tool into an **AI real-estate SaaS**:
an AI agent that answers buyer questions over WhatsApp from your listings, plus
self-hosted video ads and a talking-avatar presenter as premium add-ons.

Everything here is **additive** and **dry-run safe**. Nothing in this branch
modifies existing flows.

---

## 1. AI Real-Estate Agent  (DONE in this branch)

Files:
- `ai/agents/realEstateAgent.js` – property-aware agent. Routes through the
  existing `ai/aiBrain.js` (Ollama-first, qwen2.5:32b). Lightweight RAG over the
  catalog; tenant-scoped (missing `tenantId` throws).
- `data/realestate-properties.sample.json` – sample tenant catalog. Replace with
  real data or migrate to Postgres (`lib/db`).
- `routes/realEstate.js` – `POST /realestate/ask`, `GET /realestate/properties`.

### Wire it up
1. Mount the route in `server.js`:
   ```js
   app.use('/realestate', require('./routes/realEstate'));
   ```
2. Point AI at local Ollama (per standing decision):
   ```
   AI_PROVIDER=ollama
   OLLAMA_HOST=http://127.0.0.1:11434
   AI_MODEL=qwen2.5:32b
   ```
3. Hook into WhatsApp: in `routes/wati.js`, where inbound messages are handled,
   call `handleRealEstateConversation(phone, message, { tenantId, languageCode })`
   and send `result.reply`. Escalate to a human when `result.shouldEscalate`.
4. Test:
   ```bash
   curl -s localhost:PORT/realestate/ask \
     -H 'content-type: application/json' \
     -d '{"tenantId":"demo-tenant","message":"2 bed apartment in Islamabad?"}'
   ```

### Next (optional, higher quality)
- Replace keyword retrieval with **local embeddings** (run on PC #2) for true RAG.
- Persist catalog in Postgres with `tenant_id` (matches existing data layer).

---

## 2. AI Video Ads  (plan — runs on PC #2)

Goal: listing in → 30–60s vertical Reel out → broadcast via SuperSender.

Recommended engine: **broker-reels** (Python + ffmpeg + LLM, purpose-built for
real-estate listings). Run it on PC #2 (already has ComfyUI / MoneyPrinterTurbo).

Wiring:
1. Stand up broker-reels as a small HTTP service on PC #2 (`/render` → mp4).
2. Add a thin client under `lib/ads/` that POSTs a listing + images and gets back
   a video URL (mirror the `avatarProvider.js` dry-run pattern).
3. Feed output into the existing `video-auto-posts/` pipeline, then broadcast
   through `lib/watiBroadcast.js`.
4. Gate behind a plan flag via `lib/featureFlags/` + `lib/saasBilling/`.

---

## 3. Talking-Avatar Presenter  (stub DONE — engine on your GPUs)

File: `lib/voiceAI/avatarProvider.js` (dry-run safe; no calls until you flip it).

Engine options (self-host on 2x A6000): **LiveTalking** (real-time, lip-sync) or
**CyberVerse** (voice-first agent + digital-human video, WebRTC).

Wiring:
1. Start the engine on PC #1/#2, expose `POST /generate` → `{ video_url }`.
2. Set env:
   ```
   AVATAR_DRY_RUN=false
   AVATAR_ENGINE_URL=http://127.0.0.1:8010
   AVATAR_DEFAULT_FACE=<your-registered-face-id>
   ```
3. Call `generateAvatarVideo({ tenantId, text, imageUrl })` from a listing or
   campaign flow; attach the returned video to a broadcast.
4. Premium-tier only (feature flag + billing).

---

## Go-live checklist (this vertical)
- [ ] `app.use('/realestate', ...)` mounted in server.js
- [ ] `AI_PROVIDER=ollama`, qwen2.5:32b reachable
- [ ] Real catalog loaded (JSON or Postgres), every row has `tenantId`
- [ ] `routes/wati.js` calls the agent for real-estate tenants
- [ ] (optional) broker-reels service up on PC #2 + `lib/ads` client
- [ ] (optional) avatar engine up + `AVATAR_DRY_RUN=false`
- [ ] Plan gating via featureFlags + saasBilling for video/avatar
