'use strict';
/** lib/conversationalSupport/doctor.js - self-check for the conversational support agent. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const brain = require('./brain');
const orderFlow = require('./orderFlow');

const ROOT = path.join(__dirname, '../..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSafe = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

function run() {
  const checks = [];
  const add = (name, ok, sev = 'warning', detail = '') => checks.push({ name, ok: !!ok, severity: sev, detail });
  add('module enabled', cfg.config.enabled, 'warning', 'enabled=' + cfg.config.enabled);
  add('dry-run default on', cfg.config.dryRun, 'warning', 'dryRun=' + cfg.config.dryRun + ' (safe; flip CONV_SUPPORT_DRY_RUN=false to send)');
  add('data dir writable', (() => { try { fs.mkdirSync(cfg.paths.dir, { recursive: true }); return true; } catch { return false; } })(), 'blocker');
  add('llm hub reachable (optional)', brain.hubAvailable(), 'warning', brain.hubAvailable() ? 'Ollama/llmHub wired' : 'no hub - deterministic FAQ fallback will be used');
  add('order pipeline integration (optional)', orderFlow.pipelineAvailable(), 'warning', orderFlow.pipelineAvailable() ? 'ecommerceHub pipeline found' : 'orders will be staged locally');
  add('route module present', exists('routes/conversationalSupportRoutes.js'), 'blocker');
  add('server hook present', exists('server.js') && readSafe('server.js').includes('CONVERSATIONAL SUPPORT HOOK'), 'warning', 'run scripts/wire-conversational-support.js to add');
  const blockers = checks.filter((c) => !c.ok && c.severity === 'blocker').length;
  const nextSteps = [];
  if (!exists('routes/conversationalSupportRoutes.js')) nextSteps.push('Add routes/conversationalSupportRoutes.js');
  if (exists('server.js') && !readSafe('server.js').includes('CONVERSATIONAL SUPPORT HOOK')) nextSteps.push('Run: node scripts/wire-conversational-support.js');
  return { ok: blockers === 0, blockers, checks, nextSteps, generatedAt: new Date().toISOString() };
}

module.exports = { run };
