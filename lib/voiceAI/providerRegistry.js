// lib/voiceAI/providerRegistry.js — Runtime view of providers: capabilities + live status.
// Combines static providerConfig with current env flags. Never exposes key values.

const { config, hasEnvKeys } = require('./config');
const providerConfig = require('./providerConfig');

function describe(id) {
  const p = providerConfig[id];
  if (!p) return null;
  const keyPresent = hasEnvKeys(p.envKeys);
  // A provider is "enabled" only if it doesn't need a key, or its key is present.
  const enabled = !p.requiresApiKey || keyPresent;
  return {
    id: p.id,
    label: p.label,
    capabilities: p.capabilities,
    enabled,
    requiresApiKey: p.requiresApiKey,
    envKeys: p.envKeys,            // names only, never values
    apiKeyPresent: keyPresent,    // boolean only
    dryRun: config.dryRun || (!config.effective.liveTTS && !config.effective.liveSTT),
    supportsUrdu: p.supportsUrdu,
    supportsEnglish: p.supportsEnglish,
    supportsRomanUrdu: p.supportsRomanUrdu,
    supportsVoiceClone: p.supportsVoiceClone,
    consentRequired: p.consentRequired,
    notes: p.notes,
    riskLevel: p.riskLevel,
  };
}

function list() {
  return Object.keys(providerConfig).map(describe);
}

function get(id) { return describe(id); }

function defaultProvider() { return describe(config.defaultProvider) || describe('mock_dry_run'); }

// Static list of selectable demo voices (no provider call). Voice ids are masked downstream.
function voices() {
  return [
    { id: 'mock-ur-female', label: 'Urdu Female (demo)', language: 'urdu', provider: 'mock_dry_run' },
    { id: 'mock-ur-male', label: 'Urdu Male (demo)', language: 'urdu', provider: 'mock_dry_run' },
    { id: 'mock-roman-female', label: 'Roman Urdu Female (demo)', language: 'roman_urdu', provider: 'mock_dry_run' },
    { id: 'mock-en-female', label: 'English Female (demo)', language: 'english', provider: 'mock_dry_run' },
    { id: 'mock-en-male', label: 'English Male (demo)', language: 'english', provider: 'mock_dry_run' },
  ];
}

module.exports = { list, get, describe, defaultProvider, voices };
