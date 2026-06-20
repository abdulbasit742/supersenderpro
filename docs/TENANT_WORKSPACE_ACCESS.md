# Tenant Workspace Access

## Workspace model
`{ id, tenantId, resellerId, businessName, workspaceType, planId, seatLimit, activeSeatCount, status, dryRun, createdAt, updatedAt }`

Workspace types: tenant, reseller_managed_client, agency_workspace, internal_admin, demo, pilot, custom.

## Team member model
`{ id, workspaceId, userIdSafe, displayNameSafe, emailMasked, phoneMasked, roleId, status, seatType, invitedBySafe, lastActiveAt, dryRun, createdAt, updatedAt }`

Seat types: owner, admin, manager, agent, viewer, reseller_staff, support_agent, accountant, developer, custom.
Member statuses: invited_draft, active_preview, active, suspended_preview, removed_preview, archived.

## Isolation
- **Tenant isolation guard**: blocks any access where `resourceTenantId != tenantId` (when enforcement is on).
- **Reseller isolation guard**: blocks cross-reseller access; reseller staff are scoped to an explicit assigned-client list.

## Rules
- Full phone/email are never exposed — only masked values are stored/returned.
- No real invite tokens are generated or exposed.
- Existing auth system is never modified by default.
- No live users are created by default. `dryRun=true`.

The local preview store (`data/team-access.json`) holds masked workspace/member preview records and is gitignored.
