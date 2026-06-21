'use strict';


/**
 * Mock Gateway — safety helpers. Central offline/dry-run/no-live gating.
    */


function isTrue(v) { return String(v == null ? '' : v).trim().toLowerCase() === 'true'; }
function boolEnv(name, fallback) { const v = process.env[name]; if (v === undefined || v === null || String(v).trim() ===
'') return fallback; return isTrue(v); }


function enabled() { return boolEnv('MOCK_GATEWAY_ENABLED', true); }
function dryRun() { return boolEnv('MOCK_GATEWAY_DRY_RUN', true); }
function offlineOnly() { return boolEnv('MOCK_GATEWAY_OFFLINE_ONLY', true); }
function externalCallsEnabled() { return boolEnv('MOCK_GATEWAY_EXTERNAL_CALLS', false); }
function liveActionsEnabled() { return boolEnv('MOCK_GATEWAY_LIVE_ACTIONS', false); }
function redactPII() { return boolEnv('MOCK_GATEWAY_REDACT_PII', true); }
function redactSecrets() { return boolEnv('MOCK_GATEWAY_REDACT_SECRETS', true); }
function strict() { return boolEnv('MOCK_GATEWAY_STRICT', false); }

// Hard guarantee: this layer NEVER performs a live action or external call,
// regardless of env. The env flags are reported but the simulator code never
// branches into real I/O. These helpers exist for reporting + doctor checks.
function assertOffline() { return { offlineOnly: true, externalCallsEnabled: false, liveActionsEnabled: false }; }

module.exports = { isTrue, boolEnv, enabled, dryRun, offlineOnly, externalCallsEnabled, liveActionsEnabled, redactPII,
redactSecrets, strict, assertOffline };
