#!/usr/bin/env node
// tests/smoke/teamAccessSmoke.js — Offline smoke test. No external APIs, no auth writes, no live invites.
const fs=require('fs'); const path=require('path'); const results=[];
function check(n,fn){ try{ results.push({name:n,pass:true,detail:fn()||'ok'}); }catch(e){ results.push({name:n,pass:false,detail:e.message}); } }
function assert(c,m){ if(!c) throw new Error(m||'assertion failed'); return true; }
let T;
check('require workspace registry',()=>{ require('../../lib/teamAccess/workspaceRegistry'); return 'ok'; });
check('require team member registry',()=>{ require('../../lib/teamAccess/teamMemberRegistry'); return 'ok'; });
check('require role registry',()=>{ require('../../lib/teamAccess/roleRegistry'); return 'ok'; });
check('require permission matrix',()=>{ require('../../lib/teamAccess/permissionMatrix'); return 'ok'; });
check('require access evaluator',()=>{ require('../../lib/teamAccess/accessEvaluator'); return 'ok'; });
check('require seat usage',()=>{ require('../../lib/teamAccess/seatUsage'); return 'ok'; });
check('require invite drafts',()=>{ require('../../lib/teamAccess/inviteDrafts'); return 'ok'; });
check('require risky action gate',()=>{ require('../../lib/teamAccess/riskyActionGate'); return 'ok'; });
check('require route module',()=>{ require('../../routes/teamAccessRoutes'); return 'loaded'; });
check('barrel loads',()=>{ T=require('../../lib/teamAccess'); assert(T.workspaces&&T.evaluator&&T.invites,'missing core'); return 'ok'; });
let ws, mem;
check('create sample workspace',()=>{ ws=T.workspaces.upsert({ businessName:'Smoke Co', tenantId:'t_smoke', planId:'growth', workspaceType:'tenant' }); assert(ws.id,'no ws'); return ws.id; });
check('create sample member (masked)',()=>{ mem=T.members.upsert({ workspaceId:ws.id, displayName:'Smoke Agent', email:'a@demo.invalid', phone:'+10000000000', roleId:'support_agent', seatType:'support_agent', status:'active_preview' }); assert(mem.id&&!mem.email&&!mem.phone,'pii leaked'); return 'masked'; });
check('evaluate dashboard.view allowed',()=>{ const d=T.evaluator.evaluate({ roleId:'support_agent', workspaceId:ws.id, permission:'dashboard.view' }); assert(d.allowed===true,'should allow'); return 'allowed'; });
check('billing.manage blocked for support agent',()=>{ const d=T.evaluator.evaluate({ roleId:'support_agent', workspaceId:ws.id, permission:'billing.manage' }); assert(d.allowed===false,'should block'); return 'blocked'; });
check('tenant mismatch blocked',()=>{ const d=T.evaluator.checkTenant({ tenantId:'t_smoke', resourceTenantId:'t_other' }); assert(d.ok===false,'should block'); return 'blocked'; });
let inv;
check('create invite draft',()=>{ inv=T.invites.create({ workspaceId:ws.id, roleId:'viewer', email:'invitee@demo.invalid' }); assert(inv.ok,'invite failed'); return inv.invite.status; });
check('dryRun true',()=>{ assert(inv.invite.dryRun===true,'not dry-run'); return 'dryRun=true'; });
check('live invite disabled',()=>{ assert(T.flags.allowLiveInvites===false&&inv.liveInviteSent===false,'live invite enabled'); return 'disabled'; });
check('auth write disabled',()=>{ assert(T.flags.allowAuthWrite===false&&inv.realUserCreated===false,'auth write enabled'); return 'disabled'; });
check('risky action blocked (preview)',()=>{ const r=T.riskyActionGate.check({ actionType:'channel_live_publish', roleId:'sales_agent', workspaceId:ws.id }); assert(r.liveActionAllowed===false,'live action allowed'); return 'preview'; });
check('seat limit monitor summary',()=>{ const m=T.seatLimitMonitor.summary(); assert(typeof m.total==='number','no summary'); return `total=${m.total}`; });
check('bulk access check',()=>{ const b=T.bulkAccess.checkMany([{ roleId:'viewer', permission:'dashboard.view' },{ roleId:'support_agent', permission:'billing.manage' }]); assert(b.allowed===1&&b.blocked===1,'bulk mismatch'); return `${b.allowed}/${b.blocked}`; });
check('access history record + list',()=>{ T.accessHistory.record({ permission:'dashboard.view', roleId:'viewer', allowed:true, workspaceId:ws.id },{ kind:'smoke' }); assert(Array.isArray(T.accessHistory.list(5)),'no history'); return 'recorded'; });
check('no phone/email/token leaks',()=>{ const blob=JSON.stringify({ ws, mem, inv, dash:T.dashboard(), rep:T.report(), mon:T.seatLimitMonitor.scan(), hist:T.accessHistory.list(20) }); assert(!T.privacyGuard.hasLeak(blob),'leak detected'); return 'clean'; });

const passed=results.filter(r=>r.pass).length, failed=results.filter(r=>!r.pass).length;
const out={generatedAt:new Date().toISOString(),passed,failed,total:results.length,results};
const dir=path.join(__dirname,'..','..','artifacts'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'team_access_smoke.json'), JSON.stringify(out,null,2));
let md=`# Team Access Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md+=failed?` — ${failed} FAILED\n\n`:' — all passed ✅\n\n';
md+='| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r,i)=>{ md+=`| ${i+1} | ${r.name} | ${r.pass?'✅':'❌ FAIL'} | ${String(r.detail).replace(/\|/g,'/').slice(0,70)} |\n`; });
fs.writeFileSync(path.join(dir,'team_access_smoke.md'), md); console.log(md);
process.exit(failed===0?0:1);
