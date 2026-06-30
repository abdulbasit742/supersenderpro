# Social Content Autopilot

AI-generated social content, queued, scheduled, and published across platforms.
Part of SuperSender Pro. Self-contained, no new npm dependencies.

## Pipeline

```
topic -> AI (lib/aiAgent.runPrompt) -> caption + hashtags -> queue (video-auto-posts/queued)
      -> schedule -> publish (YouTube / Instagram / Facebook / TikTok / LinkedIn / WhatsApp)
      -> posted/ or failed/
```

## Wire it up (one line in `server.js`)

```js
app.use('/api/content-autopilot', require('./routes/contentAutopilotRoutes'));
```

## Endpoints

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET  | `/api/content-autopilot/status` | - | counts per queue folder + AI availability |
| POST | `/api/content-autopilot/generate` | `{ topic, platforms, tone, mediaPath, scheduledAt }` | AI-generate + queue one job per platform |
| GET  | `/api/content-autopilot/queue?status=queued` | - | list jobs in a folder |
| POST | `/api/content-autopilot/schedule` | `{ id, when }` | set a job's publish time |
| POST | `/api/content-autopilot/publish` | - | publish all due jobs (call from cron/n8n) |

## Auto-publish on a schedule

Hit `POST /api/content-autopilot/publish` every N minutes from cron or an
existing `n8n-workflows/` flow. Due jobs (scheduledAt in the past, or no
schedule) are published; others wait.

## Platform credentials (env)

Publishers are **credential-gated**. With no token set, a job is marked
`skipped` with the exact missing env var — it is **never** faked as posted.

| Platform | Required env |
|---|---|
| YouTube | `YOUTUBE_ACCESS_TOKEN` |
| Instagram | `META_ACCESS_TOKEN`, `IG_BUSINESS_ID` |
| Facebook | `META_ACCESS_TOKEN`, `FB_PAGE_ID` |
| TikTok | `TIKTOK_ACCESS_TOKEN` |
| LinkedIn | `LINKEDIN_ACCESS_TOKEN` |
| WhatsApp | `WATI_API_KEY` (reuse SuperSender's WATI) |

## Status: NOT production-ready

- Generation + queue + schedule + status: implemented.
- Live platform HTTP posting: **scaffolded, not implemented** (clearly marked
  `TODO(real-post)` in `index.js`). Each publisher returns a structured
  not-implemented result instead of pretending to post.
- Verify locally: mount the route, run the server, then
  `curl -X POST localhost:PORT/api/content-autopilot/generate -H 'Content-Type: application/json' -d '{"topic":"AI tools","platforms":["instagram"]}'`
  and check `video-auto-posts/queued/`.
