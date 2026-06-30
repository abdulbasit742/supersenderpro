'use strict';
/** lib/salesPipeline/doctor.js - self-check for the sales pipeline module. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const ROOT = path.join(__dirname, '../..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSafe = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

function run() {
  const checks = [];
  const add = (name, ok, sev = 'warning', detail = '') => checks.push({ name, ok: !!ok, severity: sev, detail });
  add('module enabled', cfg.config.enabled, 'warning', 'enabled=' + cfg.config.enabled);
  add('dry-run default on', cfg.config.dryRun, 'warning', 'dryRun=' + cfg.config.dryRun + ' (safe)');
  add('data dir writable', (() => { try { fs.mkdirSync(cfg.paths.dir, { recursive: true }); return true; } catch { return false; } })(), 'blocker');
  add('route module present', exists('routes/salesPipelineRoutes.js'), 'blocker');
  add('server hook present', exists('server.js') && readSafe('server.js').includes('SALES PIPELINE HOOK'), 'warning', 'run scripts/wire-sales-pipeline.js to add');
  add('stages valid', Array.isArray(cfg.stages) && cfg.stages.some((s) => s.id === 'WON') && cfg.stages.some((s) => s.id === 'LOST'), 'blocker');
  add('follow-up cadence set', cfg.config.followUpCadenceHours.length > 0, 'warning');
  const blockers = checks.filter((c) => !c.ok && c.severity === 'blocker').length;
  const nextSteps = [];
  if (!exists('routes/salesPipelineRoutes.js')) nextSteps.push('Add routes/salesPipelineRoutes.js');
  if (exists('server.js') && !readSafe('server.js').includes('SALES PIPELINE HOOK')) nextSteps.push('Run: node scripts/wire-sales-pipeline.js');
  return { ok: blockers === 0, blockers, checks, nextSteps, generatedAt: new Date().toISOString() };
}

module.exports = { run };
