// lib/demoSandbox/adapters/kpiCommandDemoAdapter.js — Demo adapter for KPI Command.
// Provides fake data to module previews. NEVER mutates real module storage.
// Returns { available:false } if the underlying module is missing.
'use strict';
const factory = require('../demoDataFactory');
let moduleAvailable = false;
try { require.resolve('../../lib/ownerBriefing'); moduleAvailable = true; } catch (_e) { moduleAvailable = false; }

function preview(scenarioKey){
  if (!moduleAvailable) return { available:false, demo:true, dryRun:true, module:'kpiCommand', note:'real module not detected — demo preview only' };
  return { available:true, demo:true, dryRun:true, module:'kpiCommand', data: factory.kpi() };
}
module.exports = { preview, moduleAvailable };
