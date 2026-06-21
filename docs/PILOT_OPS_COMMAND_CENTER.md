 # Pilot Ops Command Center

 A coordination layer to manage first pilot/trial customers after launch. It tracks leads-to-trials, onboarding progress,
 setup blockers, feedback/bugs, success + risk scores, conversion readiness, and next follow-up, all dry-run and privacy-
 safe. It does NOT rebuild funnel, demo, business setup, billing, tenant, CRM, Owner Command, KPI Command, Compliance, or
 Incident Command, it reads them through safe adapters.

 ## What it does
 Pilot registry, trial lifecycle (dry-run), onboarding checklist engine, success/risk scoring, conversion advisor,
 feedback/bug tracker, follow-up draft generator (EN / Roman Urdu / mixed), and read-only module adapters.


 ## Safety defaults
 `PILOT_OPS_DRY_RUN=true`, `PILOT_OPS_REQUIRE_CONSENT=true`, `PILOT_OPS_ALLOW_TENANT_WRITE=false`,
 `PILOT_OPS_ALLOW_BILLING_WRITE=false`, `PILOT_OPS_ALLOW_LIVE_MESSAGES=false`. No real tenant creation, no billing
 activation, no live messaging, PII masked.

 ## API
 `/status`, `/pilots` (CRUD), `/pilots/:id/start-onboarding`, `/pilots/:id/checklist`,
 `/pilots/:id/checklist/:itemId/mark`, `/pilots/:id/scores`, `/pilots/:id/scores/run`, `/pilots/:id/conversion-preview`,
 `/pilots/:id/followup-draft`, `/pilots/:id/trial/:action`, `/feedback` (CRUD), `/dashboard`, `/history`, `/doctor`,
 `/report/generate`.

 ## How to test

node scripts/pilot-ops-check.js
node tests/smoke/pilotOpsSmoke.js
npm run pilot-ops:check
npm run pilot-ops:smoke
 ## What not to commit
 `data/pilot-ops*.json`, `data/pilot-feedback*.json`, `artifacts/pilot_ops_*`.
