# Team Access — Flow Studio Nodes

If Flow Studio exists, register these metadata entries only (`lib/teamAccess/flowNodes.js`). No live external execution.

## Triggers
- `team_access.invite_draft_created`
- `team_access.role_change_previewed`
- `team_access.permission_denied`
- `team_access.seat_limit_warning`
- `team_access.risky_action_blocked`
- `team_access.tenant_isolation_warning`

## Actions (all `live:false`)
- `check_permission`
- `create_invite_draft`
- `create_role_change_preview`
- `create_seat_usage_warning`
- `request_access_approval`

`GET /api/team-access/flow-nodes` returns the registry.
