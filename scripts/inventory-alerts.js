#!/usr/bin/env node
// scripts/inventory-alerts.js
// Daily inventory alert sweep. Prints products that are low / stocked-out / at
// reorder point, with suggested order quantities. Run on PC #1 each morning so
// the owner briefing (#29) / your inbox can surface what to reorder.
//
// Usage:
//   node scripts/inventory-alerts.js
//   node scripts/inventory-alerts.js --store mystore
//
// Cron (PC #1), daily 8am:
//   0 8 * * *  cd /path/to/supersenderpro && node scripts/inventory-alerts.js >> data/inventory/alerts.log 2>&1

const path = require('path');
const fs = require('fs');
const inv = require('../lib/inventory/inventoryForecast');

function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(function main() {
  const storeId = val('--store', 'default_store');
  const alerts = inv.forecastAll({ storeId, onlyAlerts: true });
  console.log(`[inventory-alerts] ${new Date().toISOString()} store=${storeId} alerts=${alerts.length}`);
  for (const f of alerts) {
    console.log(`   ${f.status.toUpperCase().padEnd(9)} ${f.product.padEnd(28)} onHand=${String(f.onHand).padStart(4)}  cover=${f.daysOfCover == null ? '\u221e' : f.daysOfCover}d  reorder~${f.suggestedQty}`);
  }
  try {
    const dir = path.join(__dirname, '..', 'data', 'inventory'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${storeId}_last_alerts.json`), JSON.stringify({ ranAt: new Date().toISOString(), alerts }, null, 2));
  } catch {}
  process.exit(0);
})();
