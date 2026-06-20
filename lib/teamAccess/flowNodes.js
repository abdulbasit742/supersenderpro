// lib/teamAccess/flowNodes.js — Flow Studio trigger/action registry entries (metadata only, no live execution).
'use strict';
const TRIGGERS=[
  { id:'team_access.invite_draft_created', label:'Invite draft created' },
  { id:'team_access.role_change_previewed', label:'Role change previewed' },
  { id:'team_access.permission_denied', label:'Permission denied' },
  { id:'team_access.seat_limit_warning', label:'Seat limit warning' },
  { id:'team_access.risky_action_blocked', label:'Risky action blocked' },
  { id:'team_access.tenant_isolation_warning', label:'Tenant isolation warning' },
];
const ACTIONS=[
  { id:'check_permission', label:'Check permission', live:false },
  { id:'create_invite_draft', label:'Create invite draft', live:false },
  { id:'create_role_change_preview', label:'Create role change preview', live:false },
  { id:'create_seat_usage_warning', label:'Create seat usage warning', live:false },
  { id:'request_access_approval', label:'Request access approval (preview)', live:false },
];
function registry(){ return { triggers:TRIGGERS, actions:ACTIONS, liveExecution:false }; }
module.exports={ TRIGGERS, ACTIONS, registry };
