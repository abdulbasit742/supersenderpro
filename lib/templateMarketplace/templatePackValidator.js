// lib/templateMarketplace/templatePackValidator.js — Validates import packs; detects duplicate ids/slugs.
'use strict';
const registry=require('./templateRegistry');
const { validate }=require('./templateValidator');
const { hasLeak }=require('./privacyGuard');
function validatePack(pack){
  const errors=[]; const warnings=[]; const duplicates=[];
  if(!pack||!Array.isArray(pack.templates)) return { ok:false, errors:['pack.templates must be an array'], warnings:[], duplicates:[] };
  const existing=new Set(registry.all().flatMap(t=>[t.id,t.slug]));
  const seen=new Set();
  pack.templates.forEach((t,i)=>{
    const v=validate(t); if(!v.ok) errors.push(`template[${i}] (${t&&t.id||'?'}): ${v.errors.join('; ')}`);
    warnings.push(...v.warnings.map(w=>`template[${i}]: ${w}`));
    if(existing.has(t.id)||existing.has(t.slug)) duplicates.push(t.id||t.slug);
    if(seen.has(t.id)) duplicates.push(`pack-internal:${t.id}`); seen.add(t.id);
  });
  if(hasLeak(pack)) errors.push('import pack contains possible secret/PII leak');
  return { ok:errors.length===0, errors, warnings, duplicates:[...new Set(duplicates)], count:pack.templates.length };
}
module.exports={ validatePack };
