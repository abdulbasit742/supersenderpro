#!/usr/bin/env node
// scripts/number-health-report.js
// Daily number-health report. Prints each registered number\'s ban-risk + safe
// daily cap, so you (and the owner briefing #29) see at a glance which numbers
// to rest and how much you can safely send today.
//
// Usage: node scripts/number-health-report.js [--store mystore]
// Cron (PC #1) 7:30am:
//   30 7 * * *  cd /path/to/supersenderpro && node scripts/number-health-report.js >> data/number_health/report.log 2>&1

const nh = require('../lib/numberHealth/numberHealth');
function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(function main() {
  const storeId = val('--store', 'default_store');
  const list = nh.listNumbers({ storeId });
  console.log(`[number-health] ${new Date().toISOString()} store=${storeId} numbers=${list.length}`);
  for (const n of list) {
    console.log(`   ${n.band.toUpperCase().padEnd(9)} ${n.number.padEnd(18)} risk=${String(n.risk).padStart(3)}  age=${n.ageDays}d  today=${n.sentToday}/${n.dailyCap}`);
  }
  process.exit(0);
})();
