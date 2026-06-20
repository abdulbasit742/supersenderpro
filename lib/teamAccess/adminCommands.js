// lib/teamAccess/adminCommands.js — Admin command hooks (Roman Urdu/English). Documentation/integration point.
// Replies are concise and safe: no secrets, no full phone/email, no invite tokens.
'use strict';
const COMMANDS=[
  { cmd:'!teamaccess', desc:'Team Access status summary' },
  { cmd:'!workspaces', desc:'List workspaces (safe)' },
  { cmd:'!members [workspaceId]', desc:'List members of a workspace (masked)' },
  { cmd:'!roles', desc:'List roles + permissions' },
  { cmd:'!seatusage [workspaceId]', desc:'Seat usage preview' },
  { cmd:'!checkaccess [memberId] [permission]', desc:'Check access (preview)' },
  { cmd:'!invitedraft [workspaceId]', desc:'Create invite draft (no live send)' },
  { cmd:'!teamdoctor', desc:'Run Team Access doctor' },
];
// Pure handler returning safe text; an external admin bot can wire this in. No live mutation here.
function handle(command, args=[], deps={}){
  const T=deps.teamAccess||require('./index');
  const c=String(command||'').toLowerCase();
  switch(c){
    case '!teamaccess': { const d=T.doctor(); return `TeamAccess: enabled=${d.enabled} dryRun=${d.dryRun} authWrite=${d.authWriteEnabled} liveInvites=${d.liveInvitesEnabled} roles=${d.totalRoles}`; }
    case '!workspaces': { const w=T.workspaces.all(); return `Workspaces (${w.length}): `+w.slice(0,10).map(x=>`${x.businessName}[${x.workspaceType}/${x.planId}]`).join(', '); }
    case '!roles': { return `Roles: `+T.roles.ids().join(', '); }
    case '!seatusage': { const u=T.seatUsage.preview(args[0]); return u.ok?`Seats: ${u.activeSeats}/${u.seatLimit||'∞'} available=${u.availableSeats}`:'Workspace nahi mila'; }
    case '!members': { const m=T.members.listByWorkspace(args[0]); return `Members (${m.length}): `+m.slice(0,10).map(x=>`${x.displayNameSafe}[${x.roleId}]`).join(', '); }
    case '!checkaccess': { const m=T.members.get(args[0]); if(!m) return 'Member nahi mila'; const d=T.evaluator.evaluate({ roleId:m.roleId, workspaceId:m.workspaceId, permission:args[1] }); return `Access ${args[1]}: ${d.allowed?'ALLOWED':'BLOCKED'}${d.approvalRequired?' (approval required)':''}`; }
    case '!invitedraft': { const r=T.invites.create({ workspaceId:args[0], roleId:'viewer' }); return r.ok?`Invite draft banaya (preview only, live send nahi).`:'Invite draft fail'; }
    case '!teamdoctor': { const d=T.doctor(); return `Doctor: ok=${d.ok} roles=${d.totalRoles} permissions=${d.totalPermissions} sampleAllowed=${d.sampleAllowed}`; }
    default: return `Unknown command. Try: ${COMMANDS.map(x=>x.cmd.split(' ')[0]).join(' ')}`;
  }
}
module.exports={ COMMANDS, handle };
