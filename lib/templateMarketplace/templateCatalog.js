// lib/templateMarketplace/templateCatalog.js — Search/filter + visibility-scoped catalog views.
'use strict';
const registry=require('./templateRegistry');
function search({ q, category, industry, module:mod, difficulty, plan, status, visibility }={}){
  let list=registry.all();
  const t=(s)=>String(s||'').toLowerCase();
  if(q){ const k=t(q); list=list.filter(x=>t(x.title).includes(k)||t(x.description).includes(k)||(x.tags||[]).some(tag=>t(tag).includes(k))); }
  if(category) list=list.filter(x=>x.category===category);
  if(industry) list=list.filter(x=>t(x.industry)===t(industry));
  if(mod) list=list.filter(x=>(x.modulesUsed||[]).includes(mod));
  if(difficulty) list=list.filter(x=>x.difficulty===difficulty);
  if(plan) list=list.filter(x=>x.recommendedPlan===plan);
  if(status) list=list.filter(x=>x.status===status);
  if(visibility) list=list.filter(x=>x.visibility===visibility);
  return list;
}
// Public gallery exposes only public_safe + demo_only and a redacted subset of fields.
function publicGallery(){
  return registry.all().filter(x=>['public_safe','demo_only'].includes(x.visibility)&&x.status==='active')
    .map(x=>({ id:x.id, slug:x.slug, title:x.title, industry:x.industry, summary:x.description,
      modulesUsed:x.modulesUsed, estimatedSetupTime:x.estimatedSetupTime, difficulty:x.difficulty }));
}
function summary(){
  const a=registry.all();
  return { total:a.length, active:a.filter(x=>x.status==='active').length,
    industryBlueprints:a.filter(x=>x.category==='industry_blueprint').length,
    publicSafe:a.filter(x=>x.visibility==='public_safe').length,
    resellerSafe:a.filter(x=>x.visibility==='reseller_safe').length,
    categories:[...new Set(a.map(x=>x.category))], industries:[...new Set(a.map(x=>x.industry))] };
}
module.exports={ search, publicGallery, summary };
