#!/usr/bin/env node
// scripts/experiments-batch.js
// Overnight A/B evaluation — runs on PC #2. For every running experiment it:
//   1. derives conversions from the CRM interaction log (orders/replies after send)
//   2. recomputes per-variant rates + two-proportion significance vs control
//   3. auto-decides a winner when a variant is significantly better
//      (only if EXPERIMENTS_AUTODECIDE=true; otherwise it just reports)
// Writes a snapshot to public/experiments/summary.json for the dashboard.
//
// Schedule on PC #2:
//   45 3 * * *  cd /path/to/supersenderpro && node scripts/experiments-batch.js

const fs = require('fs');
const path = require('path');
const experiments = require('../lib/experiments');
const ds = require('../lib/analyticsInsights/dataSources');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'experiments', 'summary.json');
const AUTO = String(process.env.EXPERIMENTS_AUTODECIDE || 'false').toLowerCase() === 'true';

function writeSafe(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

function run() {
  let storeIds = ['default_store'];
  try { storeIds = ds.listStoreIds(); } catch { /* default */ }

  const summary = { generatedAt: new Date().toISOString(), autoDecide: AUTO, experiments: [] };
  let decided = 0;

  for (const storeId of storeIds) {
    for (const exp of experiments.listExperiments(storeId)) {
      if (exp.status !== 'running') {
        summary.experiments.push({ storeId, id: exp.id, name: exp.name, status: exp.status, winner: exp.winner });
        continue;
      }
      const r = experiments.results(storeId, exp.id, { deriveCRM: true });
      let status = exp.status;
      if (r.decided && AUTO) {
        experiments.decideWinner(exp.id, r.leader);
        status = 'decided';
        decided += 1;
      }
      summary.experiments.push({
        storeId, id: exp.id, name: exp.name, metric: exp.metric, status,
        leader: r.leader, significant: r.decided, perVariant: r.perVariant, recommendation: r.recommendation,
      });
      console.log(`[experiments] ${storeId} "${exp.name}": leader=${r.leader} significant=${r.decided}` + (r.decided && AUTO ? ' -> DECIDED' : ''));
    }
  }

  writeSafe(OUT, summary);
  console.log(`[experiments] done — evaluated=${summary.experiments.length} autoDecided=${decided} (autoDecide=${AUTO})`);
  return summary;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[experiments] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
