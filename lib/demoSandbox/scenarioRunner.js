// lib/demoSandbox/scenarioRunner.js — Loads demo data + tour steps for a scenario.
// NEVER mutates real module data and NEVER calls external APIs.
'use strict';
const { paths, load } = require('./demoConfig');
const { readJSON, writeJSON, appendHistory } = require('./store');
const factory = require('./demoDataFactory');
const registry = require('./scenarioRegistry');

// Recommended dashboard pages per module (existing pages in /public).
const PAGE_MAP = {
  business:'/unified-setup', customers:'/customer-360', orders:'/store.html', payments:'/store.html',
  whatsapp:'/channel-automation', channelAutomation:'/channel-automation', ecommerce:'/store.html',
  voiceAI:'/voice-ai', marketplace:'/marketplace-intelligence', kpi:'/owner-briefing',
  growthCampaign:'/owner-briefing', saasBilling:'/re-dashboard.html',
};

function start(scenarioId){
  const scenario = registry.get(scenarioId);
  if (!scenario) return { ok:false, error:'unknown_scenario', scenarioId, demo:true };
  const cfg = load();
  // Build local demo state only — fake data tied to the scenario's business preset.
  const data = factory.generateAll(scenario.sampleData || cfg.scenario || 'ai_tools_reseller');
  const tours = require('./tourRegistry');
  const tour = tours.get(scenario.tourSteps) || tours.get('full_product');
  const recommendedPages = [...new Set((scenario.modulesUsed||[]).map(m => PAGE_MAP[m]).filter(Boolean))];

  const saved = readJSON(paths.store, {});
  saved.activeScenario = { id:scenario.id, title:scenario.title, startedAt:new Date().toISOString(), demo:true, dryRun:true };
  saved.data = data;
  writeJSON(paths.store, saved);
  appendHistory(paths.history, { type:'scenario_start', scenario:scenario.id, demo:true });

  return {
    ok:true, demo:true, dryRun:true,
    scenario:{ id:scenario.id, title:scenario.title, description:scenario.description, expectedOutcome:scenario.expectedOutcome },
    data,
    tourSteps: tour ? tour.steps : [],
    tourId: tour ? tour.id : null,
    recommendedPages,
  };
}

module.exports = { start, PAGE_MAP };
