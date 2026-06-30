#!/usr/bin/env node
// scripts/scheduler-tick.js
// Recurring-campaign tick. Lists due schedules and prints them for the queue
// worker to dispatch. PLANS only: a worker resolves the segment (#42), filters
// through consent (#80), sends via the WhatsApp engine, then POSTs /api/scheduler/ran
// so the next run is computed.
//
// Usage: node scripts/scheduler-tick.js [--store mystore]
// Cron (PC #1) every 5 min:
//   */5 * * * *  cd /path/to/supersenderpro && node scripts/scheduler-tick.js >> data/scheduler/tick.log 2>&1

const sch = require('../lib/scheduler/recurringScheduler');
function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(function main() {
  const storeId = val('--store', 'default_store');
  const dueList = sch.due({ storeId });
  console.log(`[scheduler-tick] ${new Date().toISOString()} store=${storeId} due=${dueList.length}`);
  for (const d of dueList) console.log(`   DUE  ${d.id} (${d.name})  segment=${d.segment || '-'}  due=${d.dueISO}`);
  console.log('[scheduler-tick] dispatch each (segment -> consent filter -> send), then POST /api/scheduler/ran {id}.');
  process.exit(0);
})();
