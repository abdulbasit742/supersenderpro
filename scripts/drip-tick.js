#!/usr/bin/env node
// scripts/drip-tick.js
// Periodic drip tick. Lists steps due now across all enrollments and prints them
// for the queue worker to send. Like the other batches it PLANS only: a worker
// sends each due step via the WhatsApp engine, then calls /api/drip/sent so the
// next step is scheduled (or the sequence completes).
//
// Usage:
//   node scripts/drip-tick.js                 # default_store
//   node scripts/drip-tick.js --store mystore
//
// Cron (PC #1), every 15 minutes:
//   */15 * * * *  cd /path/to/supersenderpro && node scripts/drip-tick.js >> data/drip/tick.log 2>&1

const drip = require('../lib/drip/dripSequencer');

function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(function main() {
  const storeId = val('--store', 'default_store');
  const dueSteps = drip.due({ storeId });
  console.log(`[drip-tick] ${new Date().toISOString()} store=${storeId} due=${dueSteps.length}`);
  for (const d of dueSteps) {
    console.log(`   -> ${d.phone}  [seq ${d.sequenceId} step ${d.step}]  ${JSON.stringify(d.text).slice(0, 80)}`);
  }
  console.log('[drip-tick] enqueue these to your sender, then POST /api/drip/sent for each.');
  process.exit(0);
})();
