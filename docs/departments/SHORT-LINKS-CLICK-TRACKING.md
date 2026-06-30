# Feature #32 — Short Links & Click Tracking

Branded short URLs you can drop into any message, with **per-contact click attribution** and
click analytics. Now a broadcast/drip can answer "who clicked, from which campaign, how many
times" instead of sending blind links.

## Why
The product sends links all day but had no idea if anyone clicked. Click data is the single best
signal of engagement and intent (and feeds segments #12, analytics #9, alerts #28). This adds a
safe, self-contained link shortener + tracker.

## What it does
- **Create short links:** `create({ destination, campaign, tags, expiresAt })` → a short code +
  branded `baseUrl/l/<code>`. Destinations are **validated** (http/https only, internal hosts
  blocked, optional host allowlist) to stop open-redirect abuse.
- **Merge-tag expansion:** `expand(text, { contact, campaign })` turns `{{link:https://dest}}`
  (inline) or `{{link:CODE}}` (existing) into a **per-contact tracked URL** (`?c=<contact>&cmp=`)
  right before a send. Run it inside drip #6 / scheduler #17 / broadcast.
- **Click tracking:** the public redirect resolves a code, records a **PII-safe** click (masked
  contact, campaign, coarse UA family, referrer host, timestamp), then 302s to the destination.
  Inactive/expired links return 410.
- **Analytics:** per-link totals + unique contacts + UA breakdown + day time series, plus a
  by-campaign rollup and an overview with top links.

## Files
- `lib/shortLinks/config.js` — env posture (base url, route prefix, allowlist)
- `lib/shortLinks/store.js` — atomic JSON store (`data/short-links.json`)
- `lib/shortLinks/privacy.js` — contact mask + coarse UA + referrer host
- `lib/shortLinks/urlGuard.js` — destination validation (anti open-redirect/SSRF)
- `lib/shortLinks/codeGen.js` — unambiguous short codes
- `lib/shortLinks/linkStore.js` — create/resolve/activate links
- `lib/shortLinks/clickTracker.js` — resolve + record clicks
- `lib/shortLinks/mergeLinks.js` — `{{link:...}}` → per-contact tracked URL
- `lib/shortLinks/analytics.js` — per-link + by-campaign + overview rollups
- `lib/shortLinks/doctor.js` — offline self-check + posture
- `lib/shortLinks/index.js` — barrel
- `routes/shortLinksRoutes.js` — admin REST (`/api/short-links`) + a PUBLIC `redirect` handler
- `scripts/short-links-check.js`, `tests/smoke/shortLinksSmoke.js`

## Wiring (server.js — 3 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const shortLinksRoutes = require('./routes/shortLinksRoutes');
app.use('/api/short-links', shortLinksRoutes);          // admin API
app.get('/l/:code', shortLinksRoutes.redirect);          // PUBLIC short-link redirect
```
Expand links right before sending (drip/scheduler/broadcast):
```js
const sl = require('./lib/shortLinks');
const { text } = sl.mergeLinks.expand(messageTemplate, { contact: to, campaign: 'eid-sale' });
await waClient.sendMessage(to, text);
```
Set `SHORT_LINKS_BASE_URL` to your public domain so links look branded.

## Endpoints
- Admin (`/api/short-links`): `GET /status`, `GET /doctor`, `GET /overview`,
  `POST /links`, `GET /links`, `GET /links/:code` (+analytics), `POST /links/:id/active`,
  `POST /expand`, `GET /analytics/by-campaign`
- Public: `GET /l/:code` → 302 to destination (records the click)

## Safety
JSON-backed; destinations validated to block open-redirect/SSRF (internal hosts denied; optional
allowlist). Clicks store a **masked** contact + coarse UA only (no fingerprinting). Links
deactivated, never hard-deleted. 100% additive; no existing module/route/data changed, no new
dependency (node crypto + express).

## Env
```
SHORT_LINKS_ENABLED=true
SHORT_LINKS_BASE_URL=https://your-domain        # falls back to PUBLIC_BASE_URL
SHORT_LINKS_ROUTE_PREFIX=/l
SHORT_LINKS_CODE_LENGTH=7
SHORT_LINKS_ALLOWED_HOSTS=                       # comma-separated; empty = any public host
SHORT_LINKS_MAX_CLICKS=200000
```

## Verify
```bash
for f in lib/shortLinks/*.js; do node --check "$f"; done
node --check routes/shortLinksRoutes.js
npm run short-links:check
npm run short-links:smoke
```

Feature #32 done. Agle number ka intezaar.
