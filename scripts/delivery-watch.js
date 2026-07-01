#!/usr/bin/env node
// scripts/delivery-watch.js
// Periodic delivery watch: prints stuck shipments (past SLA) + pending customer
// notifications for the queue worker to send. PLANS only; a worker sends each
// pending notification via the WhatsApp engine and calls /api/delivery/notified.
//
// Usage: node scripts/delivery-watch.js [--store mystore]
// Cron (PC #1) hourly:
//   0 * * * *  cd /path/to/supersenderpro && node scripts/delivery-watch.js >> data/delivery/watch.log 2>&1

const del = require('../lib/delivery/deliveryTracker');
function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(function main() {
  const storeId = val('--store', 'default_store');
  const stuck = del.stuckShipments({ storeId });
  const due = del.dueNotifications({ storeId });
  console.log(`[delivery-watch] ${new Date().toISOString()} store=${storeId} stuck=${stuck.length} pendingNotify=${due.length}`);
  for (const s of stuck) console.log(`   STUCK  order=${s.orderId} status=${s.status} ${s.hoursInStatus}h (sla ${s.slaHours}h) phone=${s.phone}`);
  for (const n of due) console.log(`   NOTIFY order=${n.orderId} -> ${n.phone}: ${JSON.stringify(n.message).slice(0, 70)}`);
  console.log('[delivery-watch] send pending notifications, then POST /api/delivery/notified for each.');
  process.exit(0);
})();
