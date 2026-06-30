# Feature #12 — Contacts & Segmentation

A single, deduped **contact book** for the whole product, plus a safe **dynamic segment**
engine so every other department (broadcast, drip, support) can target the right people
instead of raw phone lists.

## Why
Contacts were implied across CRM/lead-gen but there was no unified, deduped book with tags,
custom fields, and consent — and no way to define a reusable audience like "VIP tag AND active
in last 30 days, excluding opted-out". This adds that, consent-aware, as a self-contained dept.

## What it does
- **Unified contact book:** `upsert({phone,email,name,tags,fields})` normalizes phone
  (Pakistan `03xx -> +923xx`, `0092/92` handled) + email, and **dedupes** by identity key so
  the same person never doubles up. Repeat captures merge non-destructively.
- **Tags + custom fields:** add/remove tags, arbitrary `fields` map per contact.
- **Consent/opt-out:** `opted_in` / `opted_out` / `unknown`, with opt-out timestamp.
- **Dynamic segments:** a SAFE JSON **rule tree** (`{all:[...]}` / `{any:[...]}` of leaf
  conditions over `tag`, `field:<name>`, `consent`, `status`, `lastActivityDays`,
  `createdDays`; operators eq/neq/contains/exists/gt/lt/gte/lte/in). **No eval, no code
  execution.** Membership is always evaluated **live**.
- **Consent-aware resolution:** segment results + `resolveRecipients()` exclude opted-out
  contacts by default, so downstream sends can't reach them.

## Files
- `lib/contacts/config.js` — env posture (default country, consent exclusion)
- `lib/contacts/store.js` — atomic JSON store (`data/contacts.json`)
- `lib/contacts/normalize.js` — PK-aware phone + email normalization + identity key
- `lib/contacts/privacy.js` — phone/email/name masking for views
- `lib/contacts/contactStore.js` — dedupe upsert, tags, fields, consent, archive
- `lib/contacts/segmentEngine.js` — safe rule-tree evaluation + saved segments
- `lib/contacts/doctor.js` — offline self-check + posture
- `lib/contacts/index.js` — barrel
- `routes/contactsRoutes.js` — REST surface (`/api/contacts`)
- `scripts/contacts-check.js`, `tests/smoke/contactsSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const contactsRoutes = require('./routes/contactsRoutes');
app.use('/api/contacts', contactsRoutes);
```
Feed it wherever contacts appear (lead capture, inbound message, checkout):
```js
require('./lib/contacts').contactStore.upsert({ phone: from, name: pushName, source: 'whatsapp' });
```
Resolve a saved segment for a broadcast/drip (consent-safe):
```js
const to = require('./lib/contacts').segmentEngine.resolveRecipients(segmentId);
```

## Endpoints (`/api/contacts`)
- `GET /status`, `GET /doctor`
- `POST /contacts` (upsert/merge), `GET /contacts/:id`
- `POST /contacts/:id/tags` `{ add:[], remove:[] }`, `POST /contacts/:id/fields` `{ fields }`
- `POST /contacts/:id/consent` `{ consent }`, `POST /contacts/:id/archive`
- `POST /segments/preview` `{ rule, limit? }` — evaluate without saving
- `GET /segments`, `POST /segments` `{ name, rule }`, `GET /segments/:id`
- `GET /segments/:id/recipients` — consent-safe recipient count

## Safety
JSON-backed; phone/email/name masked in every view. Segments use a JSON rule tree — **no eval**.
Consent-aware: opted-out contacts excluded from segments + recipient resolution by default.
Contacts archived, never hard-deleted. 100% additive; no existing module/route/data changed,
no new dependency.

## Env
```
CONTACTS_ENABLED=true
CONTACTS_DEFAULT_COUNTRY=PK
CONTACTS_EXCLUDE_OPTED_OUT=true             # opted-out excluded from segments (recommended)
CONTACTS_MAX_SEGMENT_PREVIEW=1000
```

## Verify
```bash
for f in lib/contacts/*.js; do node --check "$f"; done
node --check routes/contactsRoutes.js
npm run contacts:check
npm run contacts:smoke
```

Feature #12 done. Agle number ka intezaar.
