// routes/teamAccessRoutes.js — Express router for Team Seats + Role Permissions + Tenant Workspace Access.
// Mounted at /api/team-access. All routes dry-run safe: no real auth user creation, no live invite, no PII/secrets.
const express=require('express');
const router=express.Router();
const T=require('../lib/teamAccess');
const privacy=require('../lib/teamAccess/privacyGuard');

function safe(fn){ return async (req,res)=>{ try{
  const out=await fn(req,res);
  if(out!==undefined&&!res.headersSent){
    if(privacy.hasLeak(out)) return res.status(500).json({ ok:false, error:'response_blocked_pii_leak' });
    res.json(out);
  }
}catch(e){ res.status(500).json({ ok:false, error:e.message||'team_access_error' }); } }; }

// Status / dashboard / doctor / report
router.get('/status', safe(()=>({ ok:true, enabled:T.flags.enabled, dryRun:T.flags.dryRun,
  authWriteEnabled:T.flags.allowAuthWrite, liveInvitesEnabled:T.flags.allowLiveInvites,
  requireApproval:T.flags.requireApproval, requireAudit:T.flags.requireAudit,
  enforceTenantIsolation:T.flags.enforceTenantIsolation })));
router.get('/dashboard', safe(()=>({ ok:true, dashboard:T.dashboard() })));
router.get('/doctor', safe(()=>({ ok:true, doctor:T.doctor() })));
router.post('/report/generate', safe(()=>({ ok:true, report:T.report() })));

// Workspaces
router.get('/workspaces', safe(()=>({ ok:true, workspaces:T.workspaces.all() })));
router.post('/workspaces', safe((req)=>({ ok:true, workspace:T.workspaces.upsert(req.body||{}) })));
router.get('/workspaces/:id', safe((req)=>{ const w=T.workspaces.get(req.params.id); return w?{ ok:true, workspace:w }:{ ok:false, error:'not_found' }; }));
router.put('/workspaces/:id', safe((req)=>({ ok:true, workspace:T.workspaces.upsert({ ...(req.body||{}), id:req.params.id }) })));

// Members
router.get('/workspaces/:id/members', safe((req)=>({ ok:true, members:T.members.listByWorkspace(req.params.id) })));
router.post('/workspaces/:id/members', safe((req)=>({ ok:true, member:T.members.upsert({ ...(req.body||{}), workspaceId:req.params.id }) })));
router.get('/members/:id', safe((req)=>{ const m=T.members.get(req.params.id); return m?{ ok:true, member:m }:{ ok:false, error:'not_found' }; }));
router.put('/members/:id', safe((req)=>({ ok:true, member:T.members.upsert({ ...(req.body||{}), id:req.params.id }) })));
router.post('/members/:id/suspend-preview', safe((req)=>T.members.suspendPreview(req.params.id)));
router.post('/members/:id/remove-preview', safe((req)=>T.members.removePreview(req.params.id)));

// Roles / permissions / matrix
router.get('/roles', safe(()=>({ ok:true, roles:T.roles.all() })));
router.get('/permissions', safe(()=>({ ok:true, permissions:T.permissions.PERMISSIONS, risky:T.permissions.RISKY })));
router.get('/matrix', safe(()=>({ ok:true, matrix:T.matrix.matrix() })));
router.post('/roles/:id/permission-preview', safe((req)=>T.roles.permissionChangePreview(req.params.id, (req.body||{}).add||[], (req.body||{}).remove||[])));

// Access checks
router.post('/check', safe((req)=>({ ok:true, decision:T.evaluator.evaluate(req.body||{}) })));
router.post('/check/tenant', safe((req)=>({ ok:true, decision:T.evaluator.checkTenant(req.body||{}) })));
router.post('/check/reseller', safe((req)=>({ ok:true, decision:T.evaluator.checkReseller(req.body||{}) })));
router.post('/check/risky-action', safe((req)=>({ ok:true, decision:T.riskyActionGate.check(req.body||{}) })));

// Seats
router.get('/workspaces/:id/seats', safe((req)=>({ ok:true, seats:T.seatUsage.preview(req.params.id) })));
router.post('/workspaces/:id/seat-usage-preview', safe((req)=>({ ok:true, seats:T.seatUsage.preview(req.params.id) })));

// Invites (draft only)
router.post('/workspaces/:id/invite-draft', safe((req)=>T.invites.create({ ...(req.body||{}), workspaceId:req.params.id })));
router.get('/invites', safe((req)=>({ ok:true, invites:T.invites.list(Number(req.query.limit)||100) })));
router.get('/invites/:id', safe((req)=>{ const i=T.invites.get(req.params.id); return i?{ ok:true, invite:i }:{ ok:false, error:'not_found' }; }));
router.post('/invites/:id/cancel-preview', safe((req)=>T.invites.cancelPreview(req.params.id)));

// Flow nodes (metadata only)
router.get('/flow-nodes', safe(()=>({ ok:true, ...T.flowNodes.registry() })));

module.exports=router;
