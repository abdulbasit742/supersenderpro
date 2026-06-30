#!/usr/bin/env node
// scripts/experiments-batch.js — overnight A/B evaluation for PC #2.
const fs = require('fs');
const path = require('path');
const experiments = require('../lib/experiments');
const ds = require('../lib/analyticsInsights/dataSources');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'experiments', 'summary.json');
const AUTO = String(process.env.EXPERIMENTS_AUTODECIDE || 'false').toLowerCase() === 'true';
function writeSafe(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2)); }
function run() { let storeIds = ['default_store']; try { storeIds = ds.listStoreIds(); } catch {} const summary = { generatedAt: new Date().toISOString(), autoDecide: AUTO, experiments: [] }; let decided = 0; for (const storeId of storeIds) { for (const exp of experiments.listExperiments(storeId)) { if (exp.status !== 'running') { summary.experiments.push({ storeId, id: exp.id, name: exp.name, status: exp.status, winner: exp.winner }); continue; } const r = experiments.results(storeId, exp.id, { deriveCRM: true }); let status = exp.status; if (r.decided && AUTO) { experiments.decideWinner(exp.id, r.leader); status = 'decided'; decided += 1; } summary.experiments.push({ storeId, id: exp.id, name: exp.name, metric: exp.metric, status, leader: r.leader, significant: r.decided, perVariant: r.perVariant, recommendation: r.recommendation }); console.log(`[experiments] ${storeId} "${exp.name}": leader=${r.leader} significant=${r.decided}`); } } writeSafe(OUT, summary); console.log(`[experiments] done — evaluated=${summary.experiments.length} autoDecided=${decided}`); return summary; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[experiments] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
