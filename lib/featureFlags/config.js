// lib/featureFlags/config.js — Paths + resolved config for Feature Flags.
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
  store: resolvePath(process.env.FEATURE_FLAGS_STORE_PATH,'data/feature-flags.json'),
  history: resolvePath(process.env.FEATURE_FLAGS_HISTORY_PATH,'data/feature-flags-history.json'),
};
module.exports={ paths, flags, ROOT };
