// lib/templateMarketplace/blueprintInstaller.js — Orchestrates plan + preview; live install gated off by default.
'use strict';
const planner=require('./installPlanner');
const preview=require('./installPreview');
const history=require('./installHistory');
const { canInstallLive }=require('./safetyGuard');
const { paths }=require('./config');
const { appendHistory }=require('./store');

function buildPlan(templateId, opts={}){ const p=planner.plan(templateId, opts);
  appendHistory(paths.history,{ type:'blueprint_preview', templateId, ok:p.ok }); return p; }
function installPreview(templateId, opts={}){ const r=preview.preview(templateId, opts);
  history.record({ templateId, preview:true, ok:r.ok }); return r; }
// Live install intentionally refuses unless explicitly enabled; even then it only records intent here.
function install(templateId, opts={}){
  if(!canInstallLive()) return { ok:false, blocked:true, reason:'live_install_disabled',
    message:'Set TEMPLATE_MARKETPLACE_ALLOW_INSTALL=true AND TEMPLATE_MARKETPLACE_ALLOW_LIVE_ACTIONS=true to enable.',
    fallback: installPreview(templateId, opts) };
  history.record({ templateId, live:true, ok:true, note:'live install gateway (delegates to module adapters)' });
  return { ok:true, live:true, templateId, note:'Live install enabled — delegated to module owners.', plan:planner.plan(templateId,{...opts,requireLive:true}) };
}
module.exports={ buildPlan, installPreview, install };
