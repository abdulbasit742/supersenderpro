// lib/templateMarketplace/templateImportExport.js — Redacted export + dry-run import preview.
'use strict';
const registry=require('./templateRegistry');
const { redact, hasLeak }=require('./privacyGuard');
const { validatePack }=require('./templatePackValidator');

// Fields safe to export. Runtime/customer/order/payment data is never included.
const EXPORT_FIELDS=['id','title','slug','category','industry','audience','description','tags','modulesUsed',
  'includedRecipes','includedPlaybooks','includedCampaigns','includedSupportArticles','includedOwnerTasks',
  'recommendedPlan','difficulty','estimatedSetupTime','language','visibility','status','dryRun'];
function exportPack(ids){
  let list=registry.all(); if(Array.isArray(ids)&&ids.length) list=list.filter(t=>ids.includes(t.id));
  const templates=list.map(t=>{ const o={}; EXPORT_FIELDS.forEach(f=>{ if(t[f]!==undefined) o[f]=t[f]; }); return redact(o); });
  const pack={ packVersion:1, exportedAt:new Date().toISOString(), redacted:true, count:templates.length, templates };
  return { ok:!hasLeak(pack), pack, markdown:toMarkdown(pack) };
}
function toMarkdown(pack){
  let md=`# Template Pack Export\n\nExported: ${pack.exportedAt} · ${pack.count} template(s) · redacted\n\n`;
  pack.templates.forEach(t=>{ md+=`## ${t.title}\n- **Industry:** ${t.industry}\n- **Category:** ${t.category}\n- **Modules:** ${(t.modulesUsed||[]).join(', ')}\n- **Setup:** ${t.estimatedSetupTime} · ${t.difficulty}\n\n${t.description||''}\n\n`; });
  return md;
}
// Import is PREVIEW ONLY: validate + duplicate detection; never auto-activates.
function importPreview(pack){
  const v=validatePack(pack);
  return { ok:v.ok, preview:true, autoActivated:false, validation:v,
    note:'Imported templates are NOT activated automatically. Review duplicates and validation first.' };
}
module.exports={ exportPack, importPreview, EXPORT_FIELDS };
