// lib/demoSandbox/adapters/growthCampaignDemoAdapter.js — Demo adapter for Growth Campaigns.
// Provides fake data to module previews. NEVER mutates real module storage.
// Returns { available:false } if the underlying module is missing.
'use strict';
const factory = require('../demoDataFactory');
let moduleAvailable = false;
try { require.resolve('../../routes/growth.js'); moduleAvailable = true; } catch (_e) { moduleAvailable = false; }

function preview(scenarioKey){
  if (!moduleAvailable) return { available:false, demo:true, dryRun:true, module:'growthCampaign', note:'real module not detected — demo preview only' };
  return { available:true, demo:true, dryRun:true, module:'growthCampaign', data: { segments:factory.customers().slice(0,3), plan:{name:'Demo Campaign',channels:['whatsapp'],dryRun:true} } };
}
module.exports = { preview, moduleAvailable };
