# Cross-Tenant Simulations

`lib/tenantIsolation/crossTenantSimulation.js` runs 10 safe simulations using synthetic fixtures (no real data, no external calls).

Scenarios: tenant A→B customer read, reseller→unassigned client, support→billing admin, developer unsupported scope, public→private lead, workspace A→B, webhook raw payload, audit raw export, Customer 360 full email, billing payment ref.

Each returns:
```
{ id, name, expectedBlock, actualDecision, passed, warnings, blockers, dryRun }
```
Endpoints: `GET /api/tenant-isolation/simulations`, `POST /api/tenant-isolation/simulations/run`.
