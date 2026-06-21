'use strict';


/**
    * Pilot Ops — safety helpers. Central dry-run + live-action gating. Built-ins only.
    */


function isTrue(v) { return String(v == null ? '' : v).trim().toLowerCase() === 'true'; }
function boolEnv(name, fallback) {
  const v = process.env[name];
     if (v === undefined || v === null || String(v).trim() === '') return fallback;
     return isTrue(v);
}

function enabled() { return boolEnv('PILOT_OPS_ENABLED', true); }
function dryRun() { return boolEnv('PILOT_OPS_DRY_RUN', true); }
function requireConsent() { return boolEnv('PILOT_OPS_REQUIRE_CONSENT', true); }
function allowTenantWrite() { return boolEnv('PILOT_OPS_ALLOW_TENANT_WRITE', false); }
function allowBillingWrite() { return boolEnv('PILOT_OPS_ALLOW_BILLING_WRITE', false); }
function allowLiveMessages() { return boolEnv('PILOT_OPS_ALLOW_LIVE_MESSAGES', false); }
function defaultLanguage() { return (process.env.PILOT_OPS_DEFAULT_LANGUAGE || 'roman_urdu').trim(); }

// A gate is open only if its env flag is true AND global dry-run is off.
function gate(kind) {
     const map = { tenant: allowTenantWrite(), billing: allowBillingWrite(), message: allowLiveMessages() };
     const flag = !!map[kind];
     const open = flag && !dryRun();
     return { allowed: open, reason: open ? 'live_enabled' : (!flag ? kind + '_write_disabled' : 'global_dry_run') };
}

module.exports = { isTrue, boolEnv, enabled, dryRun, requireConsent, allowTenantWrite, allowBillingWrite,
allowLiveMessages, defaultLanguage, gate };
