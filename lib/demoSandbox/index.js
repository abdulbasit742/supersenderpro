// lib/demoSandbox/index.js — Barrel export for the Demo Sandbox + Guided Product Tour layer.
// Coordination layer ONLY. Does not rebuild or own any business module.
'use strict';
const demoConfig = require('./demoConfig');
const factory = require('./demoDataFactory');

const adapters = {
  publicFunnel: require('./adapters/publicFunnelAdapter'),
  customer360: require('./adapters/customer360DemoAdapter'),
  ownerCommand: require('./adapters/ownerCommandDemoAdapter'),
  voiceAI: require('./adapters/voiceAIDemoAdapter'),
  channelAutomation: require('./adapters/channelAutomationDemoAdapter'),
  marketplace: require('./adapters/marketplaceDemoAdapter'),
  growthCampaign: require('./adapters/growthCampaignDemoAdapter'),
  kpiCommand: require('./adapters/kpiCommandDemoAdapter'),
  saasBilling: require('./adapters/saasBillingDemoAdapter'),
};

// Lightweight self-check used by the /doctor route and the check script.
function doctor(){
  const cfg = demoConfig.load();
  const guard = require('./demoModeGuard');
  const scenarios = require('./scenarioRegistry');
  const tours = require('./tourRegistry');
  const sampleBlock = guard.simulate('send_whatsapp', { to:'demo' });
  return {
    ok:true, demo:cfg.enabled, dryRun:cfg.dryRun, blockLiveActions:cfg.blockLiveActions,
    allowRealData:cfg.allowRealData, allowExternalCalls:cfg.allowExternalCalls,
    scenarios:scenarios.ids().length, tours:tours.ids().length,
    liveActionBlockedSample: sampleBlock.blocked === true,
    adapters: Object.keys(adapters).reduce((a,k)=>{ a[k]=adapters[k].moduleAvailable; return a; }, {}),
    checkedAt:new Date().toISOString(),
  };
}

module.exports = {
  config: demoConfig,
  guard: require('./demoModeGuard'),
  factory,
  reset: require('./demoReset'),
  scenarioRegistry: require('./scenarioRegistry'),
  scenarioRunner: require('./scenarioRunner'),
  tourRegistry: require('./tourRegistry'),
  tourState: require('./tourState'),
  adapters,
  doctor,
};
