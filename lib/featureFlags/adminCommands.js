// lib/featureFlags/adminCommands.js — Admin command handlers (concise Urdu/English; no secrets/PII).
// Integration point only: wire these into an existing admin command system; do NOT create a new bot.
'use strict';
const registry=require('./featureRegistry');
const evaluator=require('./flagEvaluator');
const rollout=require('./rolloutPreview');
const kill=require('./emergencyKillSwitch');
const { doctor }=require('./doctorRef');

function handle(cmd, arg){
  switch((cmd||'').replace(/^!/,'').toLowerCase()){
    case 'flags': { const a=registry.all(); return `Total ${a.length} flags. Enabled-preview: ${a.filter(f=>f.status==='enabled_preview').length}, disabled: ${a.filter(f=>f.status==='disabled').length}, killed: ${a.filter(f=>f.status==='killed').length}.`; }
    case 'flag': { const f=registry.get(arg); return f?`${f.name} [${f.key}] — status:${f.status}, mode:${f.rolloutMode}, risk:${f.riskLevel}.`:`Flag '${arg}' nahi mila.`; }
    case 'flagcheck': { const d=evaluator.evaluate(arg,{ userRole:'admin', planId:'business' }); return `${arg}: ${d.allowed?'ALLOWED':'BLOCKED'} (${d.reason}).`; }
    case 'rollout': { const r=rollout.preview(arg,{}); return r.ok?`Rollout preview for ${arg}: impact ${r.plan.estimatedImpact}. Approval: ${r.plan.requiredApprovals.length?'required':'no'} (preview only).`:`'${arg}' nahi mila.`; }
    case 'killswitch': { const k=kill.preview(arg,'admin_manual'); return k.ok?`Kill switch PREVIEW for ${arg}: ${k.plan.impactPreview} (not applied).`:`'${arg}' nahi mila.`; }
    case 'featuredoctor': { const d=doctor(); return `Feature flags: ${d.totalFlags} flags, liveWrite:${d.liveWriteEnabled?'ON':'off'}, killWrite:${d.killSwitchWriteEnabled?'ON':'off'}, dryRun:${d.dryRun}.`; }
    default: return 'Commands: !flags, !flag [key], !flagcheck [key], !rollout [key], !killswitch [key], !featuredoctor';
  }
}
module.exports={ handle, COMMANDS:['!flags','!flag','!flagcheck','!rollout','!killswitch','!featuredoctor'] };
