'use strict';

/**
    * Reseller Portal QA — shared helpers. Read-only. Defensive module loading so QA
    * never crashes when a reseller-portal module or related system is absent.
    */

const fs = require('fs');
const path = require('path');

function isTrue(v) { return String(v == null ? '' : v).trim().toLowerCase() === 'true'; }
function boolEnv(name, fallback) {
  const v = process.env[name];
     if (v === undefined || v === null || String(v).trim() === '') return fallback;
     return isTrue(v);
}


function enabled() { return boolEnv('RESELLER_PORTAL_QA_ENABLED', true); }
function dryRun() { return boolEnv('RESELLER_PORTAL_QA_DRY_RUN', true); }
function strict() { return boolEnv('RESELLER_PORTAL_QA_STRICT', false); }
function requirePrivacy() { return boolEnv('RESELLER_PORTAL_REQUIRE_PRIVACY_CHECK', true); }
function requirePayoutDisabled() { return boolEnv('RESELLER_PORTAL_REQUIRE_PAYOUT_DISABLED', true); }
function requireLiveMessagesDisabled() { return boolEnv('RESELLER_PORTAL_REQUIRE_LIVE_MESSAGES_DISABLED', true); }
function requireConsent() { return boolEnv('RESELLER_PORTAL_REQUIRE_CONSENT', true); }

function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
function read(rel) { try { return fs.readFileSync(path.join(process.cwd(), rel), 'utf8'); } catch (e) { return ''; } }

// Defensively require an existing reseller-portal module. Returns null if missing.
function loadPortal(name) {
  try { return require(path.join(process.cwd(), 'lib', 'resellerPortal', name)); }
     catch (e) { return null; }
}
function loadPortalSub(sub, name) {
  try { return require(path.join(process.cwd(), 'lib', 'resellerPortal', sub, name)); }
     catch (e) { return null; }
}

// Leak scanners — used by every QA module to assert safe output.
const PHONE_RE = /\b\d{10,15}\b/;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const TOKEN_RE = /(bearer\s+[a-z0-9._-]{12,}|sk-[a-z0-9]{16,}|api[_-]?key\s*[:=])/i;

function findLeaks(value) {
     const blob = typeof value === 'string' ? value : JSON.stringify(value || {});
     const leaks = [];
     if (PHONE_RE.test(blob)) leaks.push('phone');
     // ignore masked emails like a***@x.com
     if (EMAIL_RE.test(blob.replace(/\b\w\*\*\*@/g, ''))) leaks.push('email');
     if (TOKEN_RE.test(blob)) leaks.push('token');
     return leaks;
}

module.exports = {
     isTrue, boolEnv, enabled, dryRun, strict,
     requirePrivacy, requirePayoutDisabled, requireLiveMessagesDisabled, requireConsent,
     exists, read, loadPortal, loadPortalSub, findLeaks,
};
