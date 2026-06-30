# Audit Log

Tenant-scoped record of **who did what, when** for sensitive actions - a baseline compliance/security need that was missing.

## Record an action
```js
const audit = require('../lib/audit');
await audit.record(tenantId, 'billing.plan_change', req.user, { from: 'free', to: 'pro' });
```
Or as middleware on a mutating route (logs only on 2xx):
```js
const { auditAction } = require('../lib/audit/middleware');
router.post('/users/:id/role', requireRole('owner'), auditAction('auth.role_change'), handler);
```

## Read (tenant admin)
`GET /api/audit?action=&actorId=&since=&limit=` - auth + `admin` role required; returns **only the caller's tenant** entries, newest first.

## Storage
Stored via `lib/db` in the per-tenant `audit_log` collection (isolated by tenant). On the json driver it's capped at `AUDIT_MAX_PER_TENANT` (default 5000, oldest trimmed); on postgres use a retention job. Pass already-masked meta - never store raw secrets/tokens.

## Suggested action names
`auth.login`, `auth.role_change`, `billing.plan_change`, `billing.checkout`, `tenant.suspend`, `tenant.resume`, `sales.deal_won`, `invoice.created`.

## Verify
```bash
node tests/smoke/auditSmoke.js
```
