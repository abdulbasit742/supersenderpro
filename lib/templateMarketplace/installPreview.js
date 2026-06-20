// lib/templateMarketplace/installPreview.js — Generates a preview-only install (no mutation).
'use strict';
const planner=require('./installPlanner');
const registry=require('./templateRegistry');
const { canInstallLive }=require('./safetyGuard');
function preview(templateId, opts={}){
  const tpl=registry.get(templateId);
  if(!tpl) return { ok:false, error:'unknown_template', templateId };
  const p=planner.plan(templateId, opts);
  return { ok:true, preview:true, dryRun:true, liveInstallEnabled:canInstallLive(), template:{ id:tpl.id, title:tpl.title, industry:tpl.industry },
    filesAffected:[], modulesAffected:p.modulesAvailable, modulesMissing:p.modulesMissing,
    actionsPlanned:p.actionsPlanned, setupChecklist:p.setupChecklist, blockers:p.blockers, warnings:p.warnings,
    approvalRequired:true, note:'Preview only — nothing was installed or mutated.', previewedAt:new Date().toISOString() };
}
module.exports={ preview };
