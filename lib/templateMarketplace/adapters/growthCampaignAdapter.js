// lib/templateMarketplace/adapters/growthCampaignAdapter.js — Safe adapter for Growth Campaigns.
// Detects the module; returns unavailable safely if missing. Preview/install-plan ONLY.
// Never exposes secrets, never exposes full PII, never calls external APIs, never mutates the source module.
'use strict';
let available=false;
try { require.resolve('../../../routes/growth.js'); available=true; } catch (_e) { available=false; }
const MODULE='growthCampaign';
function detect(){ return { module:MODULE, available }; }
function previewPlan(template){
  if(!available) return { module:MODULE, available:false, status:'unavailable', actionsPlanned:[],
    note:'module not detected on this deployment — skipped safely' };
  const acts=(template&&template.modulesUsed||[]).includes(MODULE)
    ? [{ action:'configure_'+MODULE, target:MODULE, live:false, dryRun:true }] : [];
  return { module:MODULE, available:true, status:'preview', dryRun:true, mutatesSource:false, actionsPlanned:acts };
}
module.exports={ detect, previewPlan, available, MODULE };
