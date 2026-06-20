// lib/templateMarketplace/templateRegistry.js — Loads default + persisted templates; create/update (preview).
'use strict';
const { paths }=require('./config');
const { readJSON, writeJSON, appendHistory }=require('./store');
const { DEFAULT_TEMPLATES }=require('./defaultTemplates');

function _saved(){ return readJSON(paths.store, {}); }
function all(){
  const saved=_saved(); const custom=Array.isArray(saved.templates)?saved.templates:[];
  const map=new Map(); DEFAULT_TEMPLATES.forEach(t=>map.set(t.id,t)); custom.forEach(t=>map.set(t.id,t));
  return [...map.values()];
}
function get(id){ return all().find(t=>t.id===id||t.slug===id)||null; }
function ids(){ return all().map(t=>t.id); }
function upsert(tpl){
  const saved=_saved(); saved.templates=Array.isArray(saved.templates)?saved.templates:[];
  const now=new Date().toISOString();
  const idx=saved.templates.findIndex(t=>t.id===tpl.id);
  const base={ category:'industry_blueprint', status:'draft', visibility:'admin_only', dryRun:true, createdAt:now };
  if(idx>=0) saved.templates[idx]={ ...saved.templates[idx], ...tpl, updatedAt:now };
  else saved.templates.push({ ...base, ...tpl, updatedAt:now });
  writeJSON(paths.store, saved);
  appendHistory(paths.history,{ type:'template_upsert', id:tpl.id });
  return get(tpl.id);
}
module.exports={ all, get, ids, upsert };
