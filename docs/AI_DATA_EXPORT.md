# AI Data Export & Backup

Tenant-scoped export, scheduled backups, and safe restore for SuperSender Pro. Self-hosted, zero new dependencies, offline-safe.

## Why
Every tenant's data under `data/` should be exportable on demand and backed up on a schedule, with a safe (dry-run) restore path. No cloud, no extra services.

## What it does
- **Export**: builds a single JSON bundle of all files belonging to a tenant (path-scoped `data/<feature>/<tenantId>/...` or JSON files carrying `tenantId`).
- **Backup**: writes timestamped bundles to `data/dataExport/<tenantId>/backups/`.
- **Restore**: dry-run by default; `apply=true` writes files back. Cross-tenant restore is blocked.
- **Prune**: keeps newest N backups (default 14).
- **Describe**: optional one-line plain-words summary via self-hosted Ollama (`ai/aiBrain.processPrompt`), with template fallback when no model is running.

## Tenant isolation
Every function requires a `tenantId` and throws if missing. Bundles only contain that tenant's data. Restore refuses a backup whose manifest tenant does not match, and skips any out-of-scope file.

## Mount (does not touch server.js)
```js
app.use('/api/data-export', require('./routes/dataExportRoutes'));
```

## API
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/data-export/health` | liveness |
| GET | `/api/data-export/export` | download full tenant bundle |
| POST | `/api/data-export/backup` | create stored backup (`{ label }`) |
| GET | `/api/data-export/backups` | list stored backups |
| POST | `/api/data-export/restore?apply=true` | restore (`{ backupFile }`, dry-run unless apply) |
| GET | `/api/data-export/describe?backupFile=` | plain-words summary |
| POST | `/api/data-export/prune` | retention (`{ keep }`) |

Tenant is read from `x-tenant-id` header, or `tenantId` in body/query.

## Scheduled backups (cron)
```bash
# one tenant, keep 14
node scripts/dataExport-batch.js acme 14
# many tenants
TENANTS="acme,globex,initech" KEEP=30 node scripts/dataExport-batch.js
```
Run nightly from PC #2 (Linux batch box).

## Smoke test (offline)
```bash
node tests/smoke/dataExportSmoke.js
```
Forces Ollama unreachable, runs in an isolated temp dir, verifies tenant scoping, backup/list, dry-run + apply restore, cross-tenant block, AI fallback, and prune.
