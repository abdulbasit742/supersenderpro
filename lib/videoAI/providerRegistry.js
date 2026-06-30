// lib/videoAI/providerRegistry.js — Runtime view of video providers: capabilities + live
// status. Combines static providerConfig with current env flags. Never exposes key values.

const { config, hasEnvKeys } = require('./config');
const providerConfig = require('./providerConfig');

function describe(id) {
 const p = providerConfig[id];
 if (!p) return null;
 const keyPresent = hasEnvKeys(p.envKeys);
 const enabled = !p.requiresApiKey || keyPresent;
 return {
 id: p.id,
 label: p.label,
 capabilities: p.capabilities,
 enabled,
 requiresApiKey: p.requiresApiKey,
 envKeys: p.envKeys, // names only, never values
 apiKeyPresent: keyPresent, // boolean only
 selfHosted: !!p.selfHosted,
 dryRun: config.dryRun || !config.effective.liveGenerate,
 riskLevel: p.riskLevel,
 notes: p.notes,
 };
}

function list() {
 return Object.keys(providerConfig).map(describe);
}

function get(id) { return describe(id); }

function defaultProvider() { return describe(config.defaultProvider) || describe('mock_dry_run'); }

module.exports = { list, get, describe, defaultProvider };
