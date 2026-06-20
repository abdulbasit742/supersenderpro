# Team Access Command Center

Team Seats + Role Permissions + Tenant Workspace Access coordination layer for SuperSender Pro.

## What it does
A single, safe **coordination layer** that sits on top of existing auth/RBAC/tenant/billing systems. It does **not** rebuild them. It provides:

- Tenant workspaces, business owner seats, team-member seats, reseller/agency staff access, admin/operator preview
- A role x permission matrix with module-level permission checks
- An access evaluator (role + permission + tenant/reseller isolation + plan seat limit + feature flag + risky-action approval)
- Plan-based seat limits + seat usage preview
- An invite **draft** workflow (no live invite, no real user, no token)
- A risky-action permission gate (live actions blocked, preview/draft only)
- Safe adapters into Feature Flags / Approval Inbox / Audit Ledger / Security Gateway / billing / tenant / reseller / support / customer360 / developer portal / owner command
- A dashboard UI, check script, and smoke test

## Safety defaults (all ON)
- `dryRun=true` — no live mutations to real systems
- `no-auth-write` — never creates/modifies real auth users
- `no-live-invite` — invites are message drafts only
- `approval-required` — risky actions require approval
- `tenant isolation` — cross-tenant/reseller access blocked
- `PII masked` — full email/phone/tokens never exposed

## Files
- `lib/teamAccess/` — store, registries, roles, permissions, matrix, evaluator, seat limits, invite drafts, risky-action gate, adapters
- `routes/teamAccessRoutes.js` — API mounted at `/api/team-access`
- `public/team-access.html`, `public/js/team-access.js`, `public/css/team-access.css` — dashboard
- `scripts/team-access-check.js` — install + sample-run validation
- `tests/smoke/teamAccessSmoke.js` — offline smoke test

## API (mounted at `/api/team-access`)
`GET /status`, `GET /dashboard`, `GET /doctor`, `POST /report/generate`,
workspaces CRUD (preview), members CRUD (preview), `GET /roles|/permissions|/matrix`,
`POST /check`, `/check/tenant`, `/check/reseller`, `/check/risky-action`,
seats preview, invite-draft, flow-nodes.

## How to test
```
npm run team-access:check
npm run team-access:smoke
```

## What NOT to commit
`.env`, `data/team-access*.json`, `data/team-invites*.json`, raw member/invite data, tokens, secrets. See `.gitignore`.
