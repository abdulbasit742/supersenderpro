# SaaS License Engine

`lib/saasBilling/licenseEngine.js` (+ `licenseStore`, `licenseValidator`, `licenseKeys`).

## License model
```
{ id, tenantId, planId, status, licenseKeyMasked, startsAt, expiresAt, trialEndsAt,
  graceEndsAt, renewalDueAt, seats, featureOverrides, limitOverrides, notes, createdAt, updatedAt }
```

## Statuses
`trial · active · past_due · grace · suspended · cancelled · expired · lifetime`

The **effective** status is derived from dates by `licenseValidator.effectiveStatus()` — e.g. a
`trial` past its `trialEndsAt` becomes `grace` (if within grace) or `past_due`.

## Safety rules
- **Full license keys are never stored or returned.** Only a SHA-256 hash + a masked form
  (`SSP-****-****-XXXX`) are persisted; the public view drops the hash entirely.
- **Licenses are never hard-deleted** — status transitions to cancelled/expired.
- **No auto-suspension** of a live business unless `SAAS_BILLING_ALLOW_LIVE_SUSPENSION=true`.
  A suspend request without that flag is recorded in notes but not applied.
- Uses safe local JSON storage; if an existing DB/tenant store is wired later it can replace `licenseStore`.

## API
- `GET /api/saas-billing/tenants/:tenantId/license`
- `POST /tenants/:tenantId/license` — issue/re-issue (admin)
- `PUT /tenants/:tenantId/license` — update overrides / plan / dates (admin)

`ensureLicense(tenantId)` auto-issues a safe trial if a tenant has none.
