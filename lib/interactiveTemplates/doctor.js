'use strict';
/** lib/interactiveTemplates/doctor.js - self-check for the interactive templates module. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const payload = require('./payload');
const { examples } = require('./index');

const ROOT = path.join(__dirname, '../..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSafe = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

function run() {
  const checks = [];
  const add = (name, ok, sev = 'warning', detail = '') => checks.push({ name, ok: !!ok, severity: sev, detail });
  add('module enabled', cfg.config.enabled, 'warning', 'enabled=' + cfg.config.enabled);
  add('dry-run default on', cfg.config.dryRun, 'warning', 'dryRun=' + cfg.config.dryRun + ' (safe)');
  add('data dir writable', (() => { try { fs.mkdirSync(cfg.paths.dir, { recursive: true }); return true; } catch { return false; } })(), 'blocker');
  add('route module present', exists('routes/interactiveTemplatesRoutes.js'), 'blocker');
  add('server hook present', exists('server.js') && readSafe('server.js').includes('INTERACTIVE TEMPLATES HOOK'), 'warning', 'run scripts/wire-interactive-templates.js to add');
  const ex = examples();
  let allValid = true; const bad = [];
  Object.keys(ex).forEach((k) => { const r = payload.validate(ex[k]); if (!r.ok) { allValid = false; bad.push(k + ': ' + r.errors.join(',')); } });
  add('example templates valid', allValid, 'blocker', bad.join(' | '));
  const blockers = checks.filter((c) => !c.ok && c.severity === 'blocker').length;
  const nextSteps = [];
  if (!exists('routes/interactiveTemplatesRoutes.js')) nextSteps.push('Add routes/interactiveTemplatesRoutes.js');
  if (exists('server.js') && !readSafe('server.js').includes('INTERACTIVE TEMPLATES HOOK')) nextSteps.push('Run: node scripts/wire-interactive-templates.js');
  return { ok: blockers === 0, blockers, checks, nextSteps, generatedAt: new Date().toISOString() };
}

module.exports = { run };
