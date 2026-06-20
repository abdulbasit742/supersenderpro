// lib/featureFlags/adapters/deploymentCommandAdapter.js — Safe adapter for Deployment Command.
// Detects the module; returns unavailable safely if missing. Summary/preview ONLY.
// Never exposes secrets/full PII, never calls external APIs, never mutates the source module.
'use strict';
let available=false;
try { require.resolve('../../../lib/deploymentCommand'); available=true; } catch (_e) { available=false; }
const MODULE='deploymentCommand';
function detect(){ return { module:MODULE, available }; }
function summary(){
  if(!available) return { module:MODULE, available:false, status:'unavailable', note:'module not detected — skipped safely' };
  return { module:MODULE, available:true, status:'detected', readOnly:true,
    summary:{ plans:[], tenants:'masked', resellers:'masked' } };
}
module.exports={ detect, summary, available, MODULE };
