'use strict';
/** lib/chatbotBuilder/doctor.js - self-check for the chatbot flow builder module. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const flows = require('./flows');
const { exampleFlow } = require('./index');

const ROOT = path.join(__dirname, '../..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSafe = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

function run() {
  const checks = [];
  const add = (name, ok, sev = 'warning', detail = '') => checks.push({ name, ok: !!ok, severity: sev, detail });
  add('module enabled', cfg.config.enabled, 'warning', 'enabled=' + cfg.config.enabled);
  add('dry-run default on', cfg.config.dryRun, 'warning', 'dryRun=' + cfg.config.dryRun + ' (safe)');
  add('data dir writable', (() => { try { fs.mkdirSync(cfg.paths.dir, { recursive: true }); return true; } catch { return false; } })(), 'blocker');
  add('route module present', exists('routes/chatbotBuilderRoutes.js'), 'blocker');
  add('server hook present', exists('server.js') && readSafe('server.js').includes('CHATBOT BUILDER HOOK'), 'warning', 'run scripts/wire-chatbot-builder.js to add');
  const ex = flows.validate(exampleFlow());
  add('example flow valid', ex.ok, 'blocker', ex.errors.join('; '));
  const blockers = checks.filter((c) => !c.ok && c.severity === 'blocker').length;
  const nextSteps = [];
  if (!exists('routes/chatbotBuilderRoutes.js')) nextSteps.push('Add routes/chatbotBuilderRoutes.js');
  if (exists('server.js') && !readSafe('server.js').includes('CHATBOT BUILDER HOOK')) nextSteps.push('Run: node scripts/wire-chatbot-builder.js');
  return { ok: blockers === 0, blockers, checks, nextSteps, generatedAt: new Date().toISOString() };
}

module.exports = { run };
