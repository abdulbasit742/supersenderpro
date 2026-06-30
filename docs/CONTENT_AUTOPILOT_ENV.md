# Content Autopilot — environment variables

Set only the platforms you actually use. With a token missing, that platform's
jobs are marked `skipped` (never faked as posted).

## Platform tokens

| Var | Platform | Notes |
|---|---|---|
| `META_ACCESS_TOKEN` | Facebook + Instagram | Page/Graph API token |
| `FB_PAGE_ID` | Facebook | target Page id |
| `IG_BUSINESS_ID` | Instagram | IG business account id (needs public mediaUrl) |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn | OAuth token |
| `LINKEDIN_AUTHOR_URN` | LinkedIn | e.g. `urn:li:person:xxxx` or `urn:li:organization:xxxx` |
| `TIKTOK_ACCESS_TOKEN` | TikTok | needs public video pull_url |
| `YOUTUBE_ACCESS_TOKEN` | YouTube | upload needs the dedicated file uploader |
| `WATI_API_KEY` | WhatsApp | reuse SuperSender's existing WATI |

## Media / generation

| Var | Purpose |
|---|---|
| `PUBLIC_MEDIA_BASE_URL` | public base URL for files in `video-auto-posts/inbox/` so IG/TikTok can pull them |
| `VIDEO_GEN_URL` | optional: local ComfyUI/MoneyPrinterTurbo HTTP endpoint that returns `{ mediaUrl }` for a topic |

## Quick start

```bash
# 1) smoke test (no creds)
node scripts/test-content-autopilot.js
# 2) mount route in server.js
#    app.use('/api/content-autopilot', require('./routes/contentAutopilotRoutes'));
# 3) open the dashboard
#    http://localhost:PORT/content-autopilot.html
# 4) create a recurring campaign, then Start autopilot
```
