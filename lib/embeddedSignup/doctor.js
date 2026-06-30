'use strict';
/** lib/embeddedSignup/doctor.js - self-check for the embedded signup module. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const ROOT = path.join(__dirname, '../..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSafe = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

function run() {
  const checks = [];
  const add = (name, ok, sev = 'warning', detail = '') => checks.push({ name, ok: !!ok, severity: sev, detail });
  const c = cfg.config;
  add('module enabled', c.enabled, 'warning', 'enabled=' + c.enabled);
  add('simulation-safe by default', !cfg.isLive() || (c.appId && c.appSecret && c.configId), 'warning', cfg.isLive() ? 'LIVE' : 'simulation');
  add('data dir writable', (() => { try { fs.mkdirSync(cfg.paths.dir, { recursive: true }); return true; } catch { return false; } })(), 'blocker');
  add('route module present', exists('routes/embeddedSignupRoutes.js'), 'blocker');
  add('server hook present', exists('server.js') && readSafe('server.js').includes('EMBEDDED SIGNUP HOOK'), 'warning', 'run scripts/wire-embedded-signup.js to add');
  // Live-readiness (informational; not blockers in simulation).
  add('META_APP_ID set', !!c.appId, 'warning', 'needed to go live');
  add('META_APP_SECRET set', !!c.appSecret, 'warning', 'needed to go live (server-only)');
  add('META_ES_CONFIG_ID set', !!c.configId, 'warning', 'Embedded Signup configuration id');
  const blockers = checks.filter((x) => !x.ok && x.severity === 'blocker').length;
  const nextSteps = [];
  if (!exists('routes/embeddedSignupRoutes.js')) nextSteps.push('Add routes/embeddedSignupRoutes.js');
  if (exists('server.js') && !readSafe('server.js').includes('EMBEDDED SIGNUP HOOK')) nextSteps.push('Run: node scripts/wire-embedded-signup.js');
  if (!cfg.isLive()) nextSteps.push('After Tech Provider App Review: set META_APP_ID/META_APP_SECRET/META_ES_CONFIG_ID + EMBEDDED_SIGNUP_LIVE=true');
  return { ok: blockers === 0, blockers, live: cfg.isLive(), checks, nextSteps, generatedAt: new Date().toISOString() };
}

module.exports = { run };
