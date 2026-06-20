#!/usr/bin/env node
// scripts/team-access-check.js — Validates Team Access install + sample run.
// Never exposes secrets/full PII/invite tokens. Exits 0 unless TEAM_ACCESS_STRICT=true and blockers exist.
const fs=require('fs'); const path=require('path'); const ROOT=path.join(__dirname,'..');
const checks=[]; const add=(n,ok,d='')=>checks.push({name:n,ok:!!ok,detail:d}); const exists=(r)=>fs.existsSync(path.join(ROOT,r));

['lib/teamAccess/index.js','lib/teamAccess/store.js','lib/teamAccess/workspaceRegistry.js','lib/teamAccess/teamMemberRegistry.js',
 'lib/teamAccess/roleRegistry.js','lib/teamAccess/permissionMatrix.js','lib/teamAccess/accessEvaluator.js','lib/teamAccess/seatLimits.js',
 'lib/teamAccess/inviteDrafts.js','lib/teamAccess/riskyActionGate.js','routes/teamAccessRoutes.js',
 'public/team-access.html','public/js/team-access.js','public/css/team-access.css'].forEach(f=>add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js')&&fs.readFileSync(path.join(ROOT,'server.js'),'utf8').includes('TEAM ACCESS HOOK'));
add('env placeholders present', exists('.env.example')&&fs.readFileSync(path.join(ROOT,'.env.example'),'utf8').includes('TEAM_ACCESS_ENABLED'));
add('gitignore protections present', exists('.gitignore')&&fs.readFileSync(path.join(ROOT,'.gitignore'),'utf8').includes('team-access'));
['TEAM_ACCESS_COMMAND_CENTER.md','TEAM_ROLES_AND_PERMISSIONS.md','TENANT_WORKSPACE_ACCESS.md','SEAT_LIMITS_AND_PLANS.md',
 'INVITE_DRAFT_WORKFLOW.md','RISKY_ACTION_PERMISSION_GATE.md','TEAM_ACCESS_APPROVAL_AUDIT.md','TEAM_ACCESS_ADMIN_COMMANDS.md',
 'TEAM_ACCESS_FLOW_NODES.md'].forEach(d=>add(`doc ${d}`, exists(`docs/${d}`)));

let report;
try{
  const T=require('../lib/teamAccess');
  add('default roles load (>=14)', T.roles.ids().length>=14, `${T.roles.ids().length} roles`);
  add('default permissions load (>=40)', T.permissions.KEYS.length>=40, `${T.permissions.KEYS.length} permissions`);
  const ws=T.workspaces.upsert({ businessName:'Demo Co', tenantId:'t_demo', planId:'starter', workspaceType:'tenant' });
  add('sample workspace created (preview)', !!ws.id&&ws.preview===true);
  const mem=T.members.upsert({ workspaceId:ws.id, displayName:'Sample Admin', email:'admin@demo.invalid', roleId:'admin', seatType:'admin', status:'active_preview' });
  add('sample member created (masked, preview)', !!mem.id&&mem.preview===true&&!mem.email);
  const dview=T.evaluator.evaluate({ roleId:'admin', workspaceId:ws.id, permission:'dashboard.view' });
  add('evaluate dashboard.view allowed', dview.allowed===true);
  const bill=T.evaluator.evaluate({ roleId:'support_agent', workspaceId:ws.id, permission:'billing.manage' });
  add('support agent blocked from billing.manage', bill.allowed===false);
  const tmis=T.evaluator.checkTenant({ tenantId:'t_demo', resourceTenantId:'t_other' });
  add('tenant isolation blocks mismatch', tmis.ok===false);
  const seat=T.seatUsage.preview(ws.id);
  add('seat usage preview works', seat.ok===true&&typeof seat.activeSeats==='number');
  const inv=T.invites.create({ workspaceId:ws.id, roleId:'viewer', email:'invitee@demo.invalid' });
  add('invite draft created (no live send/token)', inv.ok===true&&inv.liveInviteSent===false&&inv.inviteTokenExposed===false);
  const risky=T.riskyActionGate.check({ actionType:'whatsapp_live_send', roleId:'sales_agent', workspaceId:ws.id });
  add('risky action blocked (preview only)', risky.ok===true&&risky.liveActionAllowed===false);
  add('auth write disabled', T.flags.allowAuthWrite===false);
  add('live invites disabled', T.flags.allowLiveInvites===false);
  report=T.report(); add('report generated', report.ok===true&&Array.isArray(report.roles));
  add('no secret/PII/token leak in report', !T.privacyGuard.hasLeak(report));
}catch(e){ add('functional pipeline', false, e.message); }

const passed=checks.filter(c=>c.ok).length, failed=checks.filter(c=>!c.ok).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:checks.length,strict:String(process.env.TEAM_ACCESS_STRICT||'false'),checks};
const dir=path.join(ROOT,'artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'team_access_check.json'), JSON.stringify(out,null,2));
let md=`# Team Access Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach(c=>{ md+=`| ${c.name} | ${c.ok?'✅':'❌'} | ${String(c.detail).slice(0,60)} |\n`; });
fs.writeFileSync(path.join(dir,'team_access_check.md'), md); console.log(md);
const strict=String(process.env.TEAM_ACCESS_STRICT||'').toLowerCase()==='true';
process.exit((strict&&failed>0)?1:0);
