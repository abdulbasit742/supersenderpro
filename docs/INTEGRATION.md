# SuperSender Pro — Feature Pack Integration

This PR adds a suite of self-contained feature packs. They are wired with a
**single block** in `server.js` via `mountFeaturePack`, and otherwise touch
nothing in the existing 2.2 MB `server.js`.

## One-block wiring

Add near the other route mounts (e.g. after `app.use('/api', reRoutes);`):

```js
const { mountFeaturePack } = require('./routes/featurePack');
mountFeaturePack(app, {
  // 1:1 WhatsApp sends + chatbot/inbox replies + order confirmations:
  sendMessage: async (to, msg) => { /* e.g. waCustomerClient.sendMessage(to + '@s.whatsapp.net', { text: msg }) */ },
  // Channel-to-channel fan-out targets:
  senders: {
    whatsapp:  async (chId, text, media) => { /* waChannelPublisher.post(...) */ },
    telegram:  async (chId, text, media) => { /* telegramBridge.post(...) */ },
    facebook:  async (chId, text) => { /* socialHub.postUpdate('facebook', text) */ },
    instagram: async (chId, text) => { /* socialHub.postUpdate('instagram', text) */ },
  },
});
```

Every dependency is optional. Omit `sendMessage`/`senders` and those features run
in **safe dry-run / draft mode** (dashboards still work, nothing is broadcast).
Each mount is isolated — one failing module never blocks the others.

## What gets mounted

| Pack | Routes prefix | Dashboard | Docs |
|------|---------------|-----------|------|
| Contacts & segmentation | `/api/contacts` | `/audience.html` | AUDIENCE_TEMPLATES.md |
| Templates & spintax | `/api/templates` | `/audience.html` | AUDIENCE_TEMPLATES.md |
| Campaign scheduler & analytics | `/api/campaigns` | `/campaigns.html` | CAMPAIGN_SCHEDULER.md |
| Chatbot & quick replies | `/api/chatbot`, `/api/quick-replies` | `/automation.html` | AUTOMATION.md |
| E-commerce connections | `/api/ecommerce` | `/connections.html` | ECOMMERCE_CONNECTIONS.md |
| Channel-to-channel sharing | `/api/channels` | `/channels.html` | CHANNEL_SHARING.md |
| Team inbox | `/api/inbox` | `/inbox.html` | (this file) |
| Developer API keys & webhooks | `/api/dev` | — | (this file) |
| Analytics overview | `/api/analytics` | `/analytics.html` | (this file) |

## Team Inbox

WATI-style shared inbox: conversations, agents, assignment, status
(`open`/`pending`/`closed`), tags, notes, unread counts.

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/DELETE | `/api/inbox/agents[/:id]` | Manage agents |
| GET | `/api/inbox/conversations` | List + counts (filter by status/assignedTo/tag) |
| GET | `/api/inbox/conversations/:id` | Conversation + messages |
| POST | `/api/inbox/incoming` | Record inbound message (`from`, `text`, `name`) |
| POST | `/api/inbox/conversations/:id/reply` | Send + log an agent reply |
| POST | `/api/inbox/conversations/:id/{assign,status,note,read,tags}` | Update |

## Developer: API keys + webhooks

- **API keys** — only a SHA-256 hash is stored; the raw key is shown once.
  Protect routes with `require('./lib/apiKeyStore').requireApiKey('scope')`.
- **Webhooks** — subscribers receive HMAC-SHA256 signed POSTs
  (`X-SSP-Signature: sha256=...`) for events:
  `campaign.completed`, `order.created`, `message.received`, `channel.shared`,
  `connection.created`.

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/DELETE | `/api/dev/keys[/:id]` | Issue / list / revoke keys |
| GET/POST/PUT/DELETE | `/api/dev/webhooks[/:id]` | Manage webhooks |
| POST | `/api/dev/webhooks/test` | Fire a test event |

## Analytics

`GET /api/analytics/overview` returns a unified roll-up across campaigns,
contacts, templates, automation, channel sharing, e-commerce, inbox, and
developer usage. Dashboard at `/analytics.html`.

## Tests

```bash
node scripts/test-campaigns.js   # 15
node scripts/test-audience.js    # 22
node scripts/test-automation.js  # 17
node scripts/test-ecommerce.js   # 26
node scripts/test-channels.js    # 21
node scripts/test-platform.js    # 27 (inbox + developer + analytics + mount)
```
