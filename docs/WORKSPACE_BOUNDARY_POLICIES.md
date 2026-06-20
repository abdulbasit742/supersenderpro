# Workspace & Boundary Policies

12 default boundary policies seed automatically (`lib/tenantIsolation/defaultBoundaryPolicies.js`).

Policy model:
```
{ id, name, boundaryType, targetModules, allowedActors, requiredFields, blockedFields, redactionRequired, strictMode, dryRun, severity }
```
Boundary types: `tenant, reseller, workspace, customer, public, admin, developer_api, support, billing, audit, generic`.

## Defaults (summary)
1. Tenant own-workspace only · 2. Reseller assigned clients only · 3. Support agent assigned tickets only · 4. Developer scoped/redacted payloads · 5. Public pages public-safe only · 6. Billing preview/redacted unless admin · 7. Audit redacted, no raw export · 8. Team member no cross-workspace · 9. Pilot/trial no full contact · 10. Customer 360 mask phone/email/payment · 11. Webhook payloads redacted · 12. Raw runtime data never public.

Endpoints: `GET/POST /api/tenant-isolation/policies`, `GET/PUT /api/tenant-isolation/policies/:id`.
