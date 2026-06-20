// lib/demoSandbox/demoReset.js — Resets demo state to fresh fake data. Non-destructive to real modules.
'use strict';
const { paths, load } = require('./demoConfig');
const { readJSON, writeJSON, appendHistory } = require('./store');
const factory = require('./demoDataFactory');

function reset(scenarioKey){
  const cfg = load();
  const key = scenarioKey || cfg.scenario || 'ai_tools_reseller';
  const data = factory.generateAll(key);
  const saved = readJSON(paths.store, {});
  saved.config = saved.config || cfg;
  saved.config.scenario = key;
  saved.config.updatedAt = new Date().toISOString();
  saved.data = data;            // demo-only sandbox state
  saved.activeScenario = null;  // cleared on reset
  saved.tour = null;
  writeJSON(paths.store, saved);
  appendHistory(paths.history, { type:'reset', scenario:key, demo:true });
  return { ok:true, demo:true, dryRun:true, scenario:key, resetAt:saved.config.updatedAt };
}

function getState(){
  const saved = readJSON(paths.store, {});
  return { ok:true, demo:true, data: saved.data || null, activeScenario: saved.activeScenario || null, tour: saved.tour || null };
}

module.exports = { reset, getState };
