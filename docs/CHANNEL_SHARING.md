# Channel-to-Channel Content Sharing

Turns the project's placeholder `channelForwarder` / `socialHub` into a complete
content-sharing engine: copy posts from **source channels** to many **target
channels** across **WhatsApp, Telegram, Facebook, and Instagram**, with content
cleaning, rebranding, dedup, drafts, throttling, and logs.

## Files added

| File | Purpose |
|------|---------|
| `lib/channelSharing/scrubber.js` | Transform pipeline: phone/link scrub, find-replace, branding footer, filters |
| `lib/channelSharing/bridges.js` | Pluggable platform adapters (whatsapp/telegram/facebook/instagram) |
| `lib/channelSharing/store.js` | Routes, per-route transforms, blacklist, presets, dedup, drafts, logs |
| `lib/channelSharing/engine.js` | `processPost()` matching → transform → dedup → draft/fan-out → throttle |
| `routes/channels.js` | REST API + `mountChannelSharing(app, { senders })` |
| `public/channels.html` | Dashboard: settings, routes, preview, draft queue, logs |
| `scripts/test-channels.js` | Offline smoke test (21 assertions, mock senders) |

## What it does

1. **Source → target routing** — one route can pull from several source channels
   and fan out to many targets on different platforms.
2. **Content cleaning** — strip seller phone numbers and links so reposted
   content can't leak the original source.
3. **Rebranding** — find/replace text + append your own branding footer
   (never double-appended).
4. **Filters** — minimum length and blocked-keyword rules per route.
5. **Dedup** — every (message, route, target) is sent at most once.
6. **Draft / approval mode** — queue posts for manual approval before they go
   live (also auto-used when a platform has no sender wired — safe by default).
7. **Throttle presets** — `safe` (4s), `fast` (1.5s), `max` (0.5s) between sends.
8. **Logs** — every send/draft/failure recorded for the dashboard.

## Pluggable platform senders

The engine never talks to an SDK directly — you inject a `senders` map, so it
works with the project's existing WhatsApp channel publisher, `telegramBridge`,
and `socialHub`, and stays unit-testable offline:

```js
const { mountChannelSharing } = require('./routes/channels');
mountChannelSharing(app, {
  senders: {
    whatsapp:  async (chId, text, media) => waChannelPublisher.post(chId, text, media),
    telegram:  async (chId, text, media) => telegramBridge.post(chId, text, media),
    facebook:  async (chId, text) => socialHub.postUpdate('facebook', text),
    instagram: async (chId, text) => socialHub.postUpdate('instagram', text),
  },
});
```

## Feeding source posts

Point your channel watcher at the ingest endpoint (or call the engine directly):

```text
POST /api/channels/ingest
{ "channelId": "mrf-tech", "messageId": "abc123", "text": "...", "media": [] }
```

```js
const { processPost } = require('./lib/channelSharing/engine');
await processPost(post, { senders });
```

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/api/channels/settings` | Enabled, draft mode, preset, scrub, branding |
| GET/POST | `/api/channels/routes` | List / create routes |
| PUT/DELETE | `/api/channels/routes/:id` | Update / delete a route |
| GET/PUT | `/api/channels/blacklist` | Source channel blacklist |
| POST | `/api/channels/ingest` | Feed a source post (webhook) |
| POST | `/api/channels/preview` | Preview the cleaned output without sending |
| GET | `/api/channels/drafts` | Pending draft queue |
| POST | `/api/channels/drafts/:id/approve` | Approve + send a draft |
| DELETE | `/api/channels/drafts/:id` | Discard a draft |
| GET | `/api/channels/logs` | Recent delivery activity |

Dashboard: `/channels.html`.

## Testing

```bash
node scripts/test-channels.js   # 21 assertions, fully offline (mock senders)
```
