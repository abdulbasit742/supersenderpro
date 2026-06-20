// lib/featureFlags/emergencyKillSwitch.js — Emergency kill switch. Preview-only unless explicitly enabled.
'use strict';
const registry=require('./featureRegistry');
const planner=require('./killSwitchPlanner');
const history=require('./rolloutHistory');
const { canKillSwitchWrite, guardKill }=require('./safetyGuard');
let auditAdapter; try{ auditAdapter=require('./adapters/auditLedgerAdapter'); }catch(_e){ auditAdapter=null; }
let incidentAdapter; try{ incidentAdapter=require('./adapters/incidentCommandAdapter'); }catch(_e){ incidentAdapter=null; }
let ownerAdapter; try{ ownerAdapter=require('./adapters/ownerCommandAdapter'); }catch(_e){ ownerAdapter=null; }

function preview(featureKey, reason='admin_manual'){
  const p=planner.plan(featureKey, reason);
  if(!p.ok) return p;
  const auditPreview=auditAdapter?auditAdapter.auditPreview({ kind:'kill_switch', featureKey, reason }):{ available:false };
  const incidentPreview=incidentAdapter?incidentAdapter.incidentPreview({ featureKey, reason }):{ available:false };
  const ownerWarning=ownerAdapter?ownerAdapter.warningPreview({ featureKey, reason }):{ available:false };
  history.record({ type:'kill_switch_previewed', featureKey, reason });
  return { ok:true, preview:true, applied:false, dryRun:true, plan:p.plan,
    ownerWarning, auditPreview, incidentPreview, rollbackRecommendation:p.plan.rollbackNote,
    note:'Kill switch PREVIEW only — feature was not actually killed.' };
}
// Apply is gated: requires explicit write env. Even then it only flips LOCAL config + records audit.
function apply(featureKey, reason='admin_manual', opts={}){
  const guard=guardKill('kill_switch_apply');
  if(!canKillSwitchWrite()) return { ok:false, blocked:true, reason:'kill_switch_write_disabled',
    message:'Set FEATURE_FLAGS_ALLOW_KILL_SWITCH_WRITE=true to enable.', fallback:preview(featureKey, reason) };
  if(!opts.approved && !opts.emergency) return { ok:false, blocked:true, reason:'approval_required',
    message:'Provide approved:true (or emergency:true) to apply kill switch.', fallback:preview(featureKey, reason) };
  const flag=registry.get(featureKey); if(!flag) return { ok:false, error:'unknown_feature' };
  const updated=registry.upsert({ key:flag.key, status:'killed', rolloutMode:'killed', killSwitchEnabled:true });
  history.record({ type:'kill_switch_applied', featureKey, reason, emergency:!!opts.emergency });
  return { ok:true, applied:true, feature:{ key:updated.key, status:updated.status }, auditRequired:true, reason };
}
module.exports={ preview, apply };
