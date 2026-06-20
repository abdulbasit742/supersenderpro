// lib/templateMarketplace/adapters/resellerAssetAdapter.js — Exposes reseller-safe template packs.
// Partner asset draft preview only. No live sharing/sending. Returns unavailable if Reseller Portal missing.
'use strict';
let resellerAvailable=false;
try{ require.resolve('../../../lib/resellerNetwork.js'); resellerAvailable=true; }catch(_e){ resellerAvailable=false; }
const catalog=require('../templateCatalog');
function resellerPacks(){
  const packs=catalog.search({ visibility:'reseller_safe' }).map(t=>({ id:t.id, slug:t.slug, title:t.title,
    industry:t.industry, summary:t.description, modulesUsed:t.modulesUsed, recommendedPlan:t.recommendedPlan }));
  return { available:resellerAvailable, shareMode:'draft_preview_only', liveSharing:false, packs };
}
function partnerAssetDraft(templateId){
  const t=catalog.search({}).find(x=>x.id===templateId);
  if(!t) return { ok:false, error:'unknown_template' };
  return { ok:true, dryRun:true, liveSharing:false, draft:{ title:`${t.title} — Partner Asset (Draft)`,
    pitch:`[DRAFT] Resell ${t.title} to your clients. Setup ~${t.estimatedSetupTime}.`, modules:t.modulesUsed } };
}
module.exports={ resellerPacks, partnerAssetDraft, resellerAvailable };
