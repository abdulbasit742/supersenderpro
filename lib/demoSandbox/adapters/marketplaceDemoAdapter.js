// lib/demoSandbox/adapters/marketplaceDemoAdapter.js — Demo adapter for Marketplace Intelligence.
// Provides fake data to module previews. NEVER mutates real module storage.
// Returns { available:false } if the underlying module is missing.
'use strict';
const factory = require('../demoDataFactory');
let moduleAvailable = false;
try { require.resolve('../../lib/marketplaceIntelligence'); moduleAvailable = true; } catch (_e) { moduleAvailable = false; }

function preview(scenarioKey){
  if (!moduleAvailable) return { available:false, demo:true, dryRun:true, module:'marketplace', note:'real module not detected — demo preview only' };
  return { available:true, demo:true, dryRun:true, module:'marketplace', data: factory.marketplace() };
}
module.exports = { preview, moduleAvailable };
