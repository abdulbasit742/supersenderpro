// lib/featureFlags/doctorRef.js — Lightweight doctor used by admin commands (avoids circular require of index).
'use strict';
const registry=require('./featureRegistry');
const { flags }=require('./safetyGuard');
function doctor(){ const a=registry.all();
  return { ok:true, enabled:flags.enabled, dryRun:flags.dryRun, totalFlags:a.length,
    liveWriteEnabled:flags.allowLiveWrite, killSwitchWriteEnabled:flags.allowKillSwitchWrite,
    requireApproval:flags.requireApproval, requireAudit:flags.requireAudit,
    highRisk:a.filter(f=>['high','critical'].includes(f.riskLevel)).length,
    killed:a.filter(f=>f.status==='killed').length, checkedAt:new Date().toISOString() }; }
module.exports={ doctor };
