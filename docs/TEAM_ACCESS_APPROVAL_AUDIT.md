# Team Access — Approval / Audit / Security Integration

All integrations are optional and fail safe (return `available:false`) when the module is absent.

- **Role changes** → create an audit event **preview** if Audit Ledger exists.
- **Invite drafts** → create an approval item **preview** if Approval Inbox exists.
- **High-risk permission decisions** → create a security event **preview** if Security Gateway exists.
- **Tenant/reseller isolation warnings** → surfaced as compliance/security warnings.
- **Seat limit exceeded** → billing **upgrade preview** (no live billing change).

These modules are **not required** to exist. Adapters (`lib/teamAccess/adapters/*`) detect availability,
return redacted summaries only, never expose secrets/full PII, never call external APIs, and never mutate the source module.
