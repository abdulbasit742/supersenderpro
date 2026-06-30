# Feature #36 — Message Template Library

One place to author, review, and reuse message templates with `{{variables}}` — so broadcasts,
drips, the scheduler, A/B tests, and the auto-responder all pull from the same approved, version-
controlled copy instead of hardcoded strings scattered around.

## Why
Messages were strings typed inline everywhere. That means no reuse, no review, no version history,
and no way to enforce "only approved copy goes out". This adds a proper template library with
typed variables, categories, an approval workflow, and usage tracking — the content backbone for
every sending department.

## What it does
- **Templates with variables:** body uses `{{name}}` (required) or `{{name|Default text}}`
  (optional with a fallback). `parse()` derives the variable list automatically.
- **Categories + tags + search:** organize and find templates by category, tag, or free text.
- **Versioning:** editing the body bumps the version and snapshots the prior body to history.
- **Approval workflow:** `draft -> pending_review -> approved -> archived`. Editing an approved
  template's body sends it **back to draft** so changes are re-reviewed. Optionally gate `render()`
  to approved-only in production (`TEMPLATE_LIBRARY_REQUIRE_APPROVED`).
- **Strict render:** `render(id, values)` substitutes values, falls back to declared defaults,
  and **reports missing required variables** (the token is left visible, never a silent blank).
  Length-guarded; records per-template usage.

## Files
- `lib/templateLibrary/config.js` — env posture (approval gate, length cap, versions kept)
- `lib/templateLibrary/store.js` — atomic JSON store (`data/template-library.json`)
- `lib/templateLibrary/variables.js` — `{{var}}` / `{{var|default}}` parse + render
- `lib/templateLibrary/templateStore.js` — CRUD + versioning + approval workflow + usage
- `lib/templateLibrary/renderer.js` — gated render + preview
- `lib/templateLibrary/doctor.js` — offline self-check + posture
- `lib/templateLibrary/index.js` — barrel
- `routes/templateLibraryRoutes.js` — REST surface (`/api/templates`)
- `scripts/template-library-check.js`, `tests/smoke/templateLibrarySmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const templateLibraryRoutes = require('./routes/templateLibraryRoutes');
app.use('/api/templates', templateLibraryRoutes);
```
Render a template wherever you send (drip #6 / scheduler #17 / A/B #35 / broadcast):
```js
const tl = require('./lib/templateLibrary');
const r = tl.render(templateId, { name: contact.name, discount: '20' });
if (r.ok) await waClient.sendMessage(to, r.text);   // r.missing lists any unfilled required vars
```
Great with A/B #35 (each variant references a template) and short-links #32 (templates contain
`{{link:...}}` tags expanded at send time).

## Endpoints (`/api/templates`)
- `GET /status`, `GET /doctor`, `GET /categories`
- `POST /templates` `{ name, body, category, tags }`, `GET /templates` (`?category=&status=&tag=&q=`)
- `GET /templates/:id`, `PUT /templates/:id`
- `POST /templates/:id/submit|approve|archive`
- `POST /templates/:id/preview` `{ values }` (no usage/gate), `POST /templates/:id/render` `{ values, strict? }`

## Safety
JSON-backed. Approved templates re-enter draft when their body changes (no silent edits to live
copy). render() can be gated to approved-only. Missing required variables are reported, never
silently blanked. Templates archived, never hard-deleted. 100% additive; no existing module/
route/data changed, no new dependency.

## Env
```
TEMPLATE_LIBRARY_ENABLED=true
TEMPLATE_LIBRARY_REQUIRE_APPROVED=false      # true => render() only works for approved templates
TEMPLATE_LIBRARY_MAX_RENDER_CHARS=4096
TEMPLATE_LIBRARY_MAX_VERSIONS=20
```

## Verify
```bash
for f in lib/templateLibrary/*.js; do node --check "$f"; done
node --check routes/templateLibraryRoutes.js
npm run template-library:check
npm run template-library:smoke
```

Feature #36 done. Agle number ka intezaar.
