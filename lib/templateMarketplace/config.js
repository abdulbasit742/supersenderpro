// lib/templateMarketplace/config.js — Paths + resolved config for the Template Marketplace.
'use strict';
const path=require('path');
const { flags }=require('./safetyGuard');
const ROOT=path.join(__dirname,'..','..');
function resolvePath(envVal, fallbackRel){
  const val=envVal&&String(envVal).trim()?String(envVal).trim():fallbackRel;
  if(path.isAbsolute(val)||/^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel); // reject hardcoded abs paths
  return path.join(ROOT, val);
}
const paths={
  root:ROOT,
  store: resolvePath(process.env.TEMPLATE_MARKETPLACE_STORE_PATH,'data/template-marketplace.json'),
  recipes: resolvePath(process.env.TEMPLATE_MARKETPLACE_RECIPES_PATH,'data/template-recipes.json'),
  history: resolvePath(process.env.TEMPLATE_MARKETPLACE_HISTORY_PATH,'data/template-marketplace-history.json'),
};
module.exports={ paths, flags, ROOT };
