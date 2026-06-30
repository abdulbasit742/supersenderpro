# One-Click Broadcast — chats + groups + channels

Send a single message (text and/or media) to **everything** — individual chats, WhatsApp groups,
and Channels/newsletters — with one button.

## What shipped in this branch

| File | What it does |
|------|--------------|
| `lib/broadcastHub.js` | Core engine. `sendToAll({ message, mediaPath, targets })` fans out to any mix of chats/groups/channels, throttled per-recipient to avoid bans. `listTargets()` discovers everything. |
| `routes/broadcastHubRoutes.js` | REST API: `GET /api/broadcast/targets`, `POST /api/broadcast/send`, `GET /api/broadcast/log`. |
| `automations/channelForwarder.js` | **Fixed** — was only `console.log`-ing; now actually forwards via the live WA client, with media + dedupe. |

## Wiring (2 lines in server.js)

After the WhatsApp client (`waClient`) is created and ready, register the hub with the SAME client
so there's one session source of truth:

```js
const broadcastHub = require('./lib/broadcastHub');
broadcastHub.setWhatsAppClient(waClient);
app.use('/api/broadcast', require('./routes/broadcastHubRoutes'));

// (optional) enable real channel forwarding too:
const channelForwarder = require('./automations/channelForwarder');
channelForwarder.setWhatsAppClient(waClient);
```

> Important: whenever the WA client reconnects/re-inits, call `setWhatsAppClient(newClient)` again so
> the hub points at the live session.

## Frontend (lovable-app)

The "Broadcast to All" button just POSTs:

```ts
await post("/api/broadcast/send", {
  message,
  mediaPath,            // optional: local path or http(s) url
  targets: { all: true } // or { kinds: ["groups","channels"] } or { ids: ["..."] }
});
```

To build a picker, call `GET /api/broadcast/targets` — it returns `{ counts, chats, groups, channels }`.

## Targeting options

- `{ all: true }` — every chat + group + channel.
- `{ kinds: ["groups", "channels"] }` — all of the listed kinds.
- `{ ids: ["<id1@g.us>", "<id2@newsletter>"] }` — an explicit hand-picked list (mixed kinds OK).

## Safety notes

- Per-recipient delay defaults to 3s (`BROADCAST_DELAY_MS` to change). Blasting hundreds of targets
  with no delay is the fastest way to get a WhatsApp number banned — keep a delay.
- A failed recipient is logged and skipped; the run continues. Results come back as
  `{ total, sent, failed, failedDetail }`.
- Channel send/forward relies on whatsapp-web.js channel support; confirm your installed version
  exposes channels (`@newsletter`). If not, bump whatsapp-web.js.

## Follow-ups

- This uses the JSON-file logging pattern like the rest of the app. When the Postgres migration
  lands (see the SaaS roadmap), move the broadcast log + rules to the DB.
- Add scheduling (reuse the `node-cron` pattern from `automations/groupBroadcast.js`) for
  "broadcast later".
