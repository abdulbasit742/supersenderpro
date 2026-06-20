// lib/demoSandbox/adapters/channelAutomationDemoAdapter.js — Demo adapter for Channel Automation.
// Provides fake data to module previews. NEVER mutates real module storage.
// Returns { available:false } if the underlying module is missing.
'use strict';
const factory = require('../demoDataFactory');
let moduleAvailable = false;
try { require.resolve('../../lib/channelAutomationCenter.js'); moduleAvailable = true; } catch (_e) { moduleAvailable = false; }

function preview(scenarioKey){
  if (!moduleAvailable) return { available:false, demo:true, dryRun:true, module:'channelAutomation', note:'real module not detected — demo preview only' };
  return { available:true, demo:true, dryRun:true, module:'channelAutomation', data: factory.whatsapp() };
}
module.exports = { preview, moduleAvailable };
