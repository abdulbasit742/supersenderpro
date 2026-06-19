# Campaign Scheduler + Delivery Analytics

A self-contained module that adds **scheduled, throttled bulk campaigns** with
**per-recipient delivery tracking** and a **live analytics dashboard** to
SuperSender Pro. It reuses the project's existing stack (Express, `node-cron`,
file-based `data/` storage, Chart.js) and adds **no new runtime dependencies**.

## Why this feature

- Schedule a broadcast for a future time instead of sending immediately.
- **Anti-ban friendly:** configurable per-message throttle + optional daily cap
  with automatic resume the next morning.
- Personalized messages via `{name}` / `{to}` placeholders.
- Tracks every recipient: `pending → sent → delivered → read / failed`.
- Pause / resume / cancel mid-send; progress is crash-safe (persisted to disk).
- Dashboard with doughnut chart + summary stats at `/campaigns.html`.

## Files added

| File | Purpose |
|------|---------|
| `lib/campaignStore.js` | JSON persistence (`data/campaigns.json`) + analytics aggregation |
| `lib/campaignScheduler.js` | Cron loop, throttling, daily-cap, pluggable sender |
| `routes/campaigns.js` | REST API + `mountCampaigns(app, deps)` helper |
| `public/campaigns.html` | Dashboard UI (create, list, analytics chart) |
| `scripts/test-campaigns.js` | Offline smoke test (dry-run, no WhatsApp needed) |

## Wiring into `server.js`

Add these lines next to the other route mounts (around the existing
`app.use('/api', reRoutes);`):

```js
const { mountCampaigns } = require('./routes/campaigns');
mountCampaigns(app, {
  // Plug in the live WhatsApp sender already used elsewhere in server.js.
  // Omit sendMessage to run in safe DRY-RUN mode (dashboard works, nothing
  // is actually broadcast).
  sendMessage: async (to, message) => {
    // e.g. await waCustomerClient.sendMessage(to + '@s.whatsapp.net', { text: message });
  },
});
```

The dashboard is served automatically because `public/` is already static.
Open **`http://localhost:3001/campaigns.html`** (or your frontend port).

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create a campaign |
| GET | `/api/campaigns/:id` | Get one campaign (incl. delivery log) |
| DELETE | `/api/campaigns/:id` | Delete a campaign |
| POST | `/api/campaigns/:id/start` | Start sending now |
| POST | `/api/campaigns/:id/pause` | Pause an in-flight campaign |
| POST | `/api/campaigns/:id/resume` | Resume a paused campaign |
| GET | `/api/campaigns/:id/analytics` | Per-campaign delivery analytics |
| GET | `/api/campaigns-analytics/summary` | Dashboard summary across all campaigns |
| POST | `/api/campaigns/:id/receipt` | Webhook for delivered/read/failed receipts |

### Create payload

```json
{
  "name": "June promo blast",
  "message": "Hi {name}! Aaj ka special offer 20% off.",
  "recipients": ["923001234567,Ali", { "to": "923119876543", "name": "Sara" }],
  "throttleMs": 2500,
  "dailyCap": 200,
  "scheduleAt": "2026-06-20T09:00:00.000Z"
}
```

- `scheduleAt` omitted → saved as a **draft** (start manually).
- `throttleMs` → delay between each send (anti-ban). Default 2000ms.
- `dailyCap` → max messages/day (0 = unlimited). Auto-resumes next day 9am.

## Testing

```bash
node scripts/test-campaigns.js
```

Runs entirely offline in dry-run mode and exits non-zero on failure, so it can
drop straight into CI or the existing `npm run smoke` flow.
