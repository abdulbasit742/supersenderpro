# Department #1 — Lead Gen & Capture

**Top of funnel.** Turn strangers into leads from every source, and drop each lead straight into the
CRM automatically. This is the first of the numbered departments that make SuperSender a full
automated system.

## What shipped

| File | Role |
|------|------|
| `lib/leadGen/index.js` | Core engine. One entry point `captureLead()` for every source, with phone/email normalisation, dedupe (merge on repeat contact), UTM + source tracking, and best-effort auto-push into the CRM. Plus forms, lead magnets, click-to-WhatsApp and QR helpers. |
| `routes/leadGenRoutes.js` | REST API: public capture endpoints for landing pages + admin endpoints for managing forms/magnets/leads. |

## Capture sources covered

- **Landing page forms** — `POST /api/leadgen/forms/:id/submit`
- **Click-to-WhatsApp ads/links** — `GET /api/leadgen/click-to-whatsapp` builds a `wa.me` link with a campaign ref so inbound chats are attributed.
- **QR codes** — `GET /api/leadgen/qr?type=whatsapp&phone=...&campaign=...` returns a scannable PNG (uses the existing `qrcode` dep).
- **Lead magnets** — `POST /api/leadgen/magnets/:id/claim` captures the lead then hands back the asset URL.
- **Manual / API** — `POST /api/leadgen/leads`.

Every one funnels through `captureLead()`, so dedupe, attribution, and CRM push are consistent no
matter where the lead came from.

## Wiring (1 line in server.js)

```js
app.use('/api/leadgen', require('./routes/leadGenRoutes'));
```

The CRM hook auto-detects `lib/storeCRM` and calls `upsertContact`/`addCustomer` if present — no
wiring needed. If neither exists yet, leads are still saved and nothing breaks.

## Example flows

**Landing page form**
```js
// 1. admin creates a form once
POST /api/leadgen/forms { "name": "Free Demo", "fields": ["name","phone"], "redirectUrl": "/thank-you" }
// 2. the public page posts submissions
POST /api/leadgen/forms/<formId>/submit { "name": "Ali", "phone": "0300 1234567", "utm": { "campaign": "fb-jan" } }
```

**Click-to-WhatsApp QR for a poster**
```
GET /api/leadgen/qr?type=whatsapp&phone=+923001234567&message=Hi! I want the offer&campaign=poster-uni
```

## Data

Stored under `data/leadgen/` (`leads.json`, `forms.json`, `magnets.json`). Same JSON pattern as the
rest of the app today; moves to Postgres with the wider SaaS migration. Public API stays identical
after that swap.

## Follow-ups (later numbers)

- Attribute inbound WhatsApp messages that contain a `[ref:campaign]` back to the originating
  click-to-WA link / QR (close the loop on attribution).
- Lead scoring on capture (hook into `lib/leadScoring.js`).
- Rate-limit the public submit endpoints to stop spam.
