# AI Daily Owner Briefing

One short morning digest across the **whole AI suite**, so a time-strapped founder never has to open ten dashboards. Each morning it rolls up yesterday's signals — hot leads, at-risk customers, escalations, orders, voice notes, media made, new FAQ candidates — and the AI writes a crisp summary + the **top 3 things to do today**. Generated on your **self-hosted Ollama** (PC #1, 9am), delivered to your WhatsApp.

## Why

You built a lot of intelligence (#1, #3, #5, #7, #9, #11...). This is the single pane that surfaces it: instead of checking each feature, you get one message that tells you what changed and what to act on. It's the "Driver Dex 9am brief" made concrete.

## How it works

```
9am cron (PC#1) → gather KPIs from each feature's store (read-only)
   → deterministic digest (always) → AI narrative + TOP 3 TODAY (Ollama)
   → save to history → optional deliver to founder's WhatsApp
```

- **All numbers are computed deterministically** from the other features' file stores; the model only phrases them (never invents figures). Model offline → you still get the clean templated digest.
- Reads (read-only) from: lead intel (#11), order extraction (#25), voice notes (#7), media studio (#5), FAQ trainer (#27), support agent (#1) escalations. Each source is optional, missing ones just read as 0.
- **Zero new npm dependencies.**

## Files

- `lib/ownerBriefing/dailyBriefing.js` — gather + digest + AI narrative + history.
- `routes/ownerBriefingRoutes.js` — self-mountable router (mount at `/api/ai-briefing`).
- `scripts/owner-briefing-cron.js` — 9am cron runnable with optional WhatsApp delivery.
- `tests/smoke/dailyBriefingSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

Mount at `/api/ai-briefing` (distinct path so it never clashes with any existing owner-briefing routes):

```js
app.use('/api/ai-briefing', require('./routes/ownerBriefingRoutes'));
```

## 9am cron on PC #1

```bash
# daily 9am: generate + (optionally) deliver
0 9 * * *  cd /path/to/supersenderpro && node scripts/owner-briefing-cron.js >> data/owner_briefing/cron.log 2>&1
```

To deliver to your WhatsApp, set `BRIEFING_WEBHOOK_URL` to an endpoint that accepts `{ storeId, text }` and sends it (a thin wrapper around the app's existing send). If unset, the briefing is saved + logged only.

## Environment

```
BRIEFING_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
BRIEFING_WEBHOOK_URL=           # optional delivery endpoint
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/ai-briefing/generate` | Build today's briefing now. Body: `{ storeId?, sinceHours? }` |
| GET | `/api/ai-briefing/latest` | Most recent briefing |
| GET | `/api/ai-briefing/history?limit=30` | Past briefings |
| GET | `/api/ai-briefing/health` | Brain status |

### Example

```bash
curl -X POST http://localhost:3000/api/ai-briefing/generate \
  -H 'Content-Type: application/json' -d '{}'
# -> { text:"\u2600\ufe0f Daily Briefing ... TOP 3 TODAY: ...", kpis:{hotLeads:..}, source:"ollama" }
```

## Tests

```bash
node tests/smoke/dailyBriefingSmoke.js
```
