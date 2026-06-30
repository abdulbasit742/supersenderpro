# Feature #39 — Message Templates Library

A reusable library of message templates with variables, categories, validation, and versioning.
Write a message once with `{{placeholders}}`, reuse it everywhere (drip #6, scheduler #17,
broadcast, auto-reply #14, support canned replies), and render it per-contact at send time.

## Why
Message text was scattered inline across features (drip steps, canned replies, scheduled jobs).
There was no single place to manage wording, no variable validation (so a `{{name}}` typo just
shipped blank), and no version history. This centralizes templates as a self-contained dept.

## What it does
- **Reusable templates:** `{ name, category, tags, body }` with typed variables.
- **Variable syntax:** `{{name}}` and `{{name|fallback text}}`; supports dotted paths
  (`{{contact.city}}`). Missing values use the fallback, else render empty (never leak the token).
- **Validation:** `validate(body, { context })` reports which **required** variables (no
  fallback) are missing from a given context — catch blanks before you send.
- **Categories + tags:** welcome / promo / transactional / reminder / support / followup /
  general, plus free-form tags, with filters.
- **Versioning:** editing the body bumps the version and keeps the previous body in a capped
  history. Templates are archived, never hard-deleted.
- **Render:** `renderTemplate(id, context)` fills a stored template; `render(body, context)` for
  ad-hoc bodies.

## Files
- `lib/templateLibrary/config.js` — env posture (categories, version cap)
- `lib/templateLibrary/store.js` — atomic JSON store (`data/template-library.json`)
- `lib/templateLibrary/variables.js` — extract / render / validate variables
- `lib/templateLibrary/templateStore.js` — CRUD + versioning + seeded defaults
- `lib/templateLibrary/doctor.js` — offline self-check + posture
- `lib/templateLibrary/index.js` — barrel (+ `renderTemplate` convenience)
- `routes/templateLibraryRoutes.js` — REST surface (`/api/templates`)
- `scripts/template-library-check.js`, `tests/smoke/templateLibrarySmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const templateLibraryRoutes = require('./routes/templateLibraryRoutes');
app.use('/api/templates', templateLibraryRoutes);
```
Use a template in any send path:
```js
const tl = require('./lib/templateLibrary');
const { text, ok, missing } = tl.renderTemplate('order-confirm', { name, orderId, amount, currency: 'Rs' });
if (!ok) console.warn('template missing vars:', missing);   // still renders (blank/ fallback), but you know
await waClient.sendMessage(contact, text);
```
Great with A/B testing #35 (each variant can reference a template) and short-links #32
(`{{link}}` then expanded by the link merger).

## Endpoints (`/api/templates`)
- `GET /status`, `GET /doctor`, `GET /categories`
- `GET /templates` (`?category=&tag=&includeArchived=`), `GET /templates/:id`
- `POST /templates` (create/edit; body change bumps version), `POST /templates/:id/archive`
- `GET /templates/:id/history`
- `POST /validate` `{ body, declared?, context? }`
- `POST /templates/:id/render` `{ context }`, `POST /render` `{ body, context }`

## Safety
JSON-backed pure content store + renderer; **sends nothing**. Unknown tokens render empty (no
leak). Templates archived, never hard-deleted; edits keep a capped version history. 100%
additive; no existing module/route/data changed, no new dependency.

## Env
```
TEMPLATE_LIBRARY_ENABLED=true
TEMPLATE_LIBRARY_MAX_VERSIONS=20
```

## Verify
```bash
for f in lib/templateLibrary/*.js; do node --check "$f"; done
node --check routes/templateLibraryRoutes.js
npm run template-library:check
npm run template-library:smoke
```

Feature #39 done. Agle number ka intezaar.
