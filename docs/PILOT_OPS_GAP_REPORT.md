# Pilot Ops — Gap Report (scan-first)


Coordination layer on top of existing systems. Nothing rebuilt.


## Legend
exists | partially_exists | missing | duplicate_risk | safe_to_extend | needs_route | needs_ui | needs_docs | needs_test
| needs_wiring | privacy_risk | live_action_risk


## Detected (reuse via adapters)
| System | Status | Integration point |
|---|---|---|
| Incident Command | exists | incidentCommandAdapter reads health/incidents |
| Public Funnel / lead capture | partially_exists | publicFunnelAdapter reads leads safely |
| Demo Sandbox | partially_exists | demoSandboxAdapter reads demo status |
| Business Setup Wizard | partially_exists | businessSetupAdapter reads preset/progress |
| SaaS Billing | partially_exists | saasBillingAdapter (read-only; no activation) |
| Tenant Portal | partially_exists | tenantPortalAdapter (read-only; no tenant write) |
| Customer 360 | partially_exists | customer360Adapter (masked contact preview) |
| Owner Command | partially_exists | ownerCommandSummary draft only |
| KPI Command | partially_exists | kpiExportAdapter metrics only |
| Compliance Center | partially_exists | complianceAdapter gates marketing follow-up |


## Pilot Ops layer (to build)
All `lib/pilotOps/*`, `routes/pilotOpsRoutes.js`, `public/pilot-ops.*`, docs, check, smoke = missing -> create.
Classified safe_to_extend, needs_route, needs_ui, needs_docs, needs_test.


## Risk flags
- live_action_risk: controlled. Tenant write, billing write, live messages all env-gated and OFF by default.
- privacy_risk: controlled. privacyGuard masks phone/email/name; only safe previews stored.


## Verdict
safe_to_extend. Build coordination layer as new isolated files + tiny append-only hooks.

lib/pilotOps/safetyGuard.js + privacyGuard.js + store.js
