# Feature #23 — Bulk Import / Export

Get contacts **in and out** in bulk: upload a CSV (any column layout), map columns, validate +
normalize every row, preview before committing, then dedupe-import into the contact book — and
export the book back to CSV/JSON.

## Why
Contacts (#12) gave a deduped book + segments, but every contact had to be added one at a time.
Real onboarding starts with "here's my CSV of 5,000 customers". This adds a safe, preview-first
bulk pipeline (and a backup/export path) as a self-contained dept — with a dependency-free CSV
parser so it works even though the repo's `csv-parser` is stream-oriented.

## What it does
- **Dependency-free CSV parse/stringify:** handles quoted fields, escaped quotes (`""`), and
  commas/newlines inside quotes (RFC-4180-ish).
- **Column mapping:** explicit (`{ phone:'Mobile', name:'Full Name', fields:{ city:'Town' } }`)
  or best-effort **auto-map** of common headers. Unmapped columns fold into custom `fields`.
- **Validation + normalization:** PK-aware phone + email normalization (via #12 when present,
  local fallback otherwise). Bad rows are flagged with reasons and **skipped**, not aborted.
- **Dry-run preview by default:** returns valid/invalid counts, per-row errors, and a **masked**
  sample — writing nothing. Pass `commit:true` to upsert into the contact book (dedupe-aware via
  #12; merges instead of duplicating).
- **Export:** contact book → CSV or JSON. PII masked by default; `includePII:true` for owner
  backups (behind admin auth).
- **Job history:** every run recorded (totals, mapping, samples) for audit.

## Files
- `lib/bulkImportExport/config.js` — env posture (max rows, history)
- `lib/bulkImportExport/store.js` — atomic JSON store (`data/bulk-import-export.json`)
- `lib/bulkImportExport/csv.js` — dependency-free CSV parse + stringify
- `lib/bulkImportExport/validators.js` — row normalize + validate (uses #12 when present)
- `lib/bulkImportExport/columnMapper.js` — explicit + auto column mapping
- `lib/bulkImportExport/importEngine.js` — parse → map → validate → (commit) upsert + history
- `lib/bulkImportExport/exportEngine.js` — contact book → CSV/JSON (masked by default)
- `lib/bulkImportExport/doctor.js` — offline self-check + posture
- `lib/bulkImportExport/index.js` — barrel
- `routes/bulkImportExportRoutes.js` — admin REST surface (`/api/import-export`)
- `scripts/bulk-import-export-check.js`, `tests/smoke/bulkImportExportSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const bulkImportExportRoutes = require('./routes/bulkImportExportRoutes');
app.use('/api/import-export', bulkImportExportRoutes); // admin: behind your existing session/admin auth
```
Programmatic use:
```js
const ie = require('./lib/bulkImportExport');
const preview = ie.importEngine.run({ csvText });            // dry-run
const result = ie.importEngine.run({ csvText, commit: true }); // writes to the contact book (#12)
const csv = ie.exportEngine.toCSV({ includePII: true });       // owner backup
```

## Endpoints (`/api/import-export`)
- `GET /status`, `GET /doctor`
- `POST /import/preview` `{ csvText, mapping?, delimiter? }` — dry-run
- `POST /import/commit` `{ csvText, mapping?, source? }` — writes (needs #12)
- `GET /import/jobs`, `GET /import/jobs/:id`
- `GET /export?format=csv|json&includePII=true`

## Safety
JSON-backed; import is **dry-run by default** and writes nothing without `commit:true` + the
contacts dept. Preview samples are masked. Bad rows are skipped with reasons, never crash the
job. Row cap protects memory/store. Export masks PII unless explicitly overridden. 100%
additive; no existing module/route/data changed, no new dependency (CSV is hand-rolled).

## Env
```
BULK_IMPORT_EXPORT_ENABLED=true
BULK_IMPORT_EXPORT_MAX_ROWS=50000
BULK_IMPORT_EXPORT_MAX_JOB_HISTORY=100
```

## Verify
```bash
for f in lib/bulkImportExport/*.js; do node --check "$f"; done
node --check routes/bulkImportExportRoutes.js
npm run import-export:check
npm run import-export:smoke
```

Feature #23 done. Agle number ka intezaar.
