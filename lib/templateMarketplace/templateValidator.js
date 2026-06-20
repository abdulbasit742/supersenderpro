// lib/templateMarketplace/templateValidator.js — Schema + safety validation for templates.
'use strict';
const { hasLeak }=require('./privacyGuard');
const REQUIRED=['id','title','slug','category','industry','description'];
const CATEGORIES=['industry_blueprint','automation_recipe','flow_template','campaign_template','support_template','reseller_asset','public_funnel_template','demo_template','owner_command_template'];
const STATUSES=['draft','active','archived','deprecated'];
const VISIBILITY=['admin_only','reseller_safe','public_safe','demo_only'];
function validate(tpl){
  const errors=[]; const warnings=[];
  if(!tpl||typeof tpl!=='object') return { ok:false, errors:['template must be an object'], warnings:[] };
  REQUIRED.forEach(f=>{ if(!tpl[f]) errors.push(`missing required field: ${f}`); });
  if(tpl.category&&!CATEGORIES.includes(tpl.category)) errors.push(`invalid category: ${tpl.category}`);
  if(tpl.status&&!STATUSES.includes(tpl.status)) warnings.push(`unknown status: ${tpl.status}`);
  if(tpl.visibility&&!VISIBILITY.includes(tpl.visibility)) warnings.push(`unknown visibility: ${tpl.visibility}`);
  if(tpl.dryRun===false) warnings.push('dryRun is false — install actions should default to preview');
  if(hasLeak(tpl)) errors.push('template contains possible secret/PII leak');
  return { ok:errors.length===0, errors, warnings, validatedAt:new Date().toISOString() };
}
module.exports={ validate, CATEGORIES, STATUSES, VISIBILITY, REQUIRED };
