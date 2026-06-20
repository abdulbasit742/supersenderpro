# Team Roles & Permissions

## Default roles
owner, admin, operations_manager, sales_agent, support_agent, marketing_manager, ecommerce_manager,
billing_manager, compliance_reviewer, developer, reseller_owner, reseller_staff, viewer, custom.

## Permission groups
Defined in `lib/teamAccess/defaultPermissions.js` (41 permissions across dashboard, owner_command, customer360,
whatsapp, channel, growth_campaign, support, pilot_ops, reseller, billing, tenant, template, approval, audit,
developer_portal, security, feature_flags, deployment, settings).

## Safety rules (enforced in `rolePermissionMatrix.js`)
- Live send/publish/billing/tenant/security/feature-rollout permissions are **risky** → disabled or approval-required by default.
- **Viewer** is strictly read-only (no risky permission ever granted).
- **Support agent** cannot manage billing.
- **Sales agent** cannot view raw audit/security details.
- **Reseller staff** can only see assigned client previews (see reseller isolation guard).
- **Developer** cannot see secrets or full PII (redactor strips them at the adapter layer).

## Matrix
`GET /api/team-access/matrix` returns each role with granted permissions, risky permissions, and read-only flag.
Role permission changes are **preview-only** (`POST /roles/:id/permission-preview`) and never modify existing RBAC.
