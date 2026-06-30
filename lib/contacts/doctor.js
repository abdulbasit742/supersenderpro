'use strict';
/** lib/contacts/doctor.js - self-check for the contacts + segmentation module. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const segments = require('./segments');

const ROOT = path.join(__dirname, '../..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSafe = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

function run() {
  const checks = [];
  const add = (name, ok, sev = 'warning', detail = '') => checks.push({ name, ok: !!ok, severity: sev, detail });
  add('module enabled', cfg.config.enabled, 'warning', 'enabled=' + cfg.config.enabled);
  add('data dir writable', (() => { try { fs.mkdirSync(cfg.paths.dir, { recursive: true }); return true; } catch { return false; } })(), 'blocker');
  add('route module present', exists('routes/contactsRoutes.js'), 'blocker');
  add('server hook present', exists('server.js') && readSafe('server.js').includes('CONTACTS HOOK'), 'warning', 'run scripts/wire-contacts.js to add');
  const v = segments.validate({ name: 'VIPs', match: 'all', rules: [{ field: 'has_tag', op: 'has_tag', value: 'vip' }] });
  add('segment validation works', v.ok, 'blocker', v.errors.join('; '));
  const blockers = checks.filter((c) => !c.ok && c.severity === 'blocker').length;
  const nextSteps = [];
  if (!exists('routes/contactsRoutes.js')) nextSteps.push('Add routes/contactsRoutes.js');
  if (exists('server.js') && !readSafe('server.js').includes('CONTACTS HOOK')) nextSteps.push('Run: node scripts/wire-contacts.js');
  return { ok: blockers === 0, blockers, checks, nextSteps, generatedAt: new Date().toISOString() };
}

module.exports = { run };
