# Feature #26 — Audit Log (Tamper-Evident Activity Trail)

A single, append-only record of **who did what, when** across the product — hash-chained so any
edit or deletion of past history is provably detectable. The accountability layer a multi-user,
paid SaaS needs for security, compliance, and debugging.

## Why
Things happened across the app (keys issued, contacts changed, money events, sends) but there
was no unified, trustworthy trail. "Trustworthy" matters: a plain log can be quietly edited. This
uses a **SHA-256 hash chain** (each record commits to the previous one) so tampering breaks
verification at the exact altered record.

## What it does
- **Append-only records:** `record({ actor, action, target, metadata, ip, status })`.
- **Hash chain:** `hash = SHA256(prevHash + canonical(record))`. Editing or deleting any past
  record breaks every later hash; `verify()` reports the first broken index.
- **Auto-logging middleware:** `auditMiddleware()` logs mutating API calls (actor from
  `req.apiKey`/`req.user`/session, method+path, redacted params/query/body, ip, response status).
  Reads skipped unless `logReadsToo`.
- **Redaction at ingest:** sensitive keys (password/secret/token/authorization/card…) dropped;
  phone/email-looking values masked. Never logs raw secrets.
- **Query + stats + CSV export:** filter by actor/action/target/status/date; top actions/actors.
- **Safe trimming:** past `maxRecords`, oldest are trimmed and the chain **re-anchors** so the
  retained tail still verifies.

## Files
- `lib/auditLog/config.js` — env posture (max records, log reads)
- `lib/auditLog/store.js` — atomic JSON store (`data/audit-log.json`) + chain anchor
- `lib/auditLog/redact.js` — secret/PII redaction
- `lib/auditLog/hashChain.js` — canonical serialize + computeHash + verify
- `lib/auditLog/logger.js` — append-only writer (chain + trim + persist)
- `lib/auditLog/middleware.js` — Express auto-logger for mutations
- `lib/auditLog/query.js` — filter/paginate + CSV + stats
- `lib/auditLog/csv.js` — dependency-free CSV stringify
- `lib/auditLog/doctor.js` — offline self-check + live chain verification
- `lib/auditLog/index.js` — barrel
- `routes/auditLogRoutes.js` — read/admin REST surface (`/api/audit-log`) — no edit/delete by design
- `scripts/audit-log-check.js`, `tests/smoke/auditLogSmoke.js`

## Wiring (server.js — 2-3 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const auditLogRoutes = require('./routes/auditLogRoutes');
app.use('/api/audit-log', auditLogRoutes); // admin: behind your existing session/admin auth

// Auto-log all mutating API calls (mount high, before your routes):
app.use('/api', require('./lib/auditLog').auditMiddleware());
```
Or log specific events from code:
```js
require('./lib/auditLog').record({ actor: 'user:'+uid, action: 'invoice.mark_paid', target: invoiceId, metadata: { amount } });
```
Great with #20 (API keys): the middleware records `apikey:<id>` as the actor automatically.

## Endpoints (`/api/audit-log`)
- `GET /status`, `GET /doctor`, `GET /verify` (chain integrity), `GET /stats`
- `GET /records` (`?actor=&action=&target=&status=&since=&until=&limit=&offset=`)
- `POST /record` `{ actor, action, target, metadata }`
- `GET /export.csv`

## Safety
JSON-backed, **append-only** (no edit/delete endpoint by design). Metadata **redacted** at ingest.
Hash chain makes tampering detectable. Logging is wrapped so it never breaks a request. Trimming
re-anchors the chain. 100% additive; no existing module/route/data changed, no new dependency
(node crypto + express).

## Env
```
AUDIT_LOG_ENABLED=true
AUDIT_LOG_MAX_RECORDS=100000
AUDIT_LOG_LOG_READS=false                   # true => also log GET/HEAD
```

## Verify
```bash
for f in lib/auditLog/*.js; do node --check "$f"; done
node --check routes/auditLogRoutes.js
npm run audit-log:check
npm run audit-log:smoke
```

Feature #26 done. Agle number ka intezaar.
