// lib/demoSandbox/adapters/publicFunnelAdapter.js — Demo adapter for Public SaaS Funnel CTA.
// Provides fake data to module previews. NEVER mutates real module storage.
// Returns { available:false } if the underlying module is missing.
'use strict';
const factory = require('../demoDataFactory');
let moduleAvailable = false;
try { require.resolve('../../public/index.html'); moduleAvailable = true; } catch (_e) { moduleAvailable = false; }

function preview(scenarioKey){
  if (!moduleAvailable) return { available:false, demo:true, dryRun:true, module:'publicFunnel', note:'real module not detected — demo preview only' };
  return { available:true, demo:true, dryRun:true, module:'publicFunnel', data: { cta:[{label:'Try Demo',href:'/demo-sandbox.html'},{label:'Open Guided Tour',href:'/demo-sandbox.html#tours'},{label:'Start Sample Business Setup',href:'/demo-sandbox.html#scenarios'}] } };
}
module.exports = { preview, moduleAvailable };
