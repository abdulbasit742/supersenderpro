// lib/demoSandbox/adapters/customer360DemoAdapter.js — Demo adapter for Customer 360.
// Provides fake data to module previews. NEVER mutates real module storage.
// Returns { available:false } if the underlying module is missing.
'use strict';
const factory = require('../demoDataFactory');
let moduleAvailable = false;
try { require.resolve('../../lib/storeCRM.js'); moduleAvailable = true; } catch (_e) { moduleAvailable = false; }

function preview(scenarioKey){
  if (!moduleAvailable) return { available:false, demo:true, dryRun:true, module:'customer360', note:'real module not detected — demo preview only' };
  return { available:true, demo:true, dryRun:true, module:'customer360', data: factory.customers() };
}
module.exports = { preview, moduleAvailable };
