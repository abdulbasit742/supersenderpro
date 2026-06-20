# Risky Action Permission Gate

`lib/teamAccess/riskyActionGate.js` blocks live risky actions and allows preview/draft only.

## Risky actions (`modulePermissionMap.js`)
live WhatsApp send, live channel/social publish, payment verification, billing/license activation,
tenant creation/update, feature rollout write, security policy enforcement, deployment action, raw export,
webhook live delivery, API key creation, support message send, template live install.

## Default behavior
- **Block** the live action (`liveActionAllowed:false`, `mode:'preview'`).
- Allow preview/draft only.
- Create an **approval item preview** if Approval Inbox exists.
- Write a **redacted audit event preview** if Audit Ledger exists.
- Consult **Security Gateway** if available.

`POST /api/team-access/check/risky-action` with `{ actionType, roleId, workspaceId, ... }`.
