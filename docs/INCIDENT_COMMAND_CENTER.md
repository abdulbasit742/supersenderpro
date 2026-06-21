 # Incident Command Center

 A coordination layer that aggregates the health of every SuperSender Pro module into one dashboard, surfaces incidents
 with runbooks, and produces dry-run alerts. It does NOT rebuild any module, health check, launch center, or security
 scan, it reads them through safe adapters.


 ## What it monitors
 WhatsApp, channel automation, social, ecommerce, payments, SaaS billing, voice AI, customer 360, marketplace, group
 commerce, AI agents, flow studio, backup/restore, security, launch, plus env/config, routes, dashboard, storage, queues,
 auth, docs.


 ## Statuses & severity
 Statuses: healthy, warning, degraded, failing, blocked, unavailable, unknown. Severity: info, low, medium, high,
 critical. A missing module returns `unavailable` (never crashes).

 ## Incident inbox
 Doctor detection + adapter health produce incidents. Each can be acked, resolved, or snoozed, these update local incident
 state only, nothing else in the system.


 ## API
 `/status`, `/health`, `/health/run`, `/modules`, `/incidents`, `/incidents/:id`, `/incidents/:id/{ack,resolve,snooze}`,
 `/runbooks`, `/runbooks/:id`, `/doctor/run`, `/alerts`, `/alerts/test`, `/history`, `/report`, `/report/generate`.

 ## How to test

node --check routes/incidentCommandRoutes.js
node scripts/incident-command-check.js
node tests/smoke/incidentCommandSmoke.js
npm run incident-command:check
npm run incident-command:smoke
 ## What not to commit
 `data/incident-command*.json` and `artifacts/incident_command_*` (runtime + reports).
