'use strict';
/** lib/conversationalSupport/doctor.js - self-check for the Conversational Support agent. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const kb = require('./knowledgeBase');
const llm = require('./llm');

const ROOT = path.join(__dirname, '../..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSafe = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

function run() {
  const checks = [];
  const add = (name, ok, sev = 'warning', detail = '') => checks.push({ name, ok: !!ok, severity: sev, detail });
  add('module enabled', cfg.config.enabled, 'warning', 'enabled=' + cfg.config.enabled);
  add('dry-run default on', cfg.config.dryRun, 'warning', 'dryRun=' + cfg.config.dryRun + ' (safe; no auto-send)');
  add('data dir writable', (() => { try { fs.mkdirSync(cfg.paths.dir, { recursive: true }); return true; } catch { return false; } })(), 'blocker');
  add('route module present', exists('routes/conversationalSupportRoutes.js'), 'blocker');
  add('server hook or bootstrap', (exists('server.js') && readSafe('server.js').includes('CONVERSATIONAL SUPPORT HOOK')) || (exists('lib/bootstrap/registerSubsystems.js') && readSafe('lib/bootstrap/registerSubsystems.js').includes('conversationalSupportRoutes')), 'warning', 'mounted via registerSubsystems or wire script');
  add('llm hub reachable', llm.hubAvailable(), 'warning', 'Ollama/llmHub wired? deterministic fallback used if not');
  add('retriever sane', (() => { try { return kb.tokenize('Order ka status kya hai?').length > 0; } catch { return false; } })(), 'blocker');
  const blockers = checks.filter((c) => !c.ok && c.severity === 'blocker').length;
  const nextSteps = [];
  if (!exists('routes/conversationalSupportRoutes.js')) nextSteps.push('Add routes/conversationalSupportRoutes.js');
  if (!llm.hubAvailable()) nextSteps.push('Start Ollama + wire lib/llmHub for AI-phrased answers (optional; deterministic fallback works now)');
  return { ok: blockers === 0, blockers, checks, nextSteps, generatedAt: new Date().toISOString() };
}

module.exports = { run };
