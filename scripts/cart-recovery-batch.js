#!/usr/bin/env node
// scripts/cart-recovery-batch.js
// Hourly abandoned-cart sweep. Detects stalled draft orders and builds recovery
// cadences. Intended to run hourly (PC #1, model warm). Sending is delegated to
// your queue/worker: this only PLANS the cadence (each step has a whenISO);
// enqueue due steps via BullMQ (lib/queueManager.js) and call markStepSent.
//
// Usage:
//   node scripts/cart-recovery-batch.js                 # default_store
//   node scripts/cart-recovery-batch.js --store mystore --stall 3
//
// Cron (PC #1), hourly:
//   0 * * * *  cd /path/to/supersenderpro && node scripts/cart-recovery-batch.js >> data/cart_recovery/batch.log 2>&1

const cart = require('../lib/cartRecovery/cartRecovery');

function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(async () => {
  const storeId = val('--store', 'default_store');
  const stallHours = parseFloat(val('--stall', process.env.CART_STALL_HOURS || '2'));
  console.log(`[cart-recovery] scan store=${storeId} stall=${stallHours}h at ${new Date().toISOString()}`);
  const result = await cart.scan({ storeId, stallHours });
  console.log(`[cart-recovery] stalled=${result.stalled} new-cadences=${result.started}`);
  const active = cart.listActive({ storeId });
  const due = [];
  const now = Date.now();
  for (const rec of active) {
    for (const s of rec.steps) {
      if (!s.sent && new Date(s.whenISO).getTime() <= now) due.push({ phone: rec.phone, step: s.step, text: s.text });
    }
  }
  console.log(`[cart-recovery] ${due.length} step(s) due now (enqueue these to your sender):`);
  due.forEach(d => console.log(`   -> ${d.phone} [step ${d.step}]`));
  process.exit(0);
})().catch((e) => { console.error('[cart-recovery] failed:', e); process.exit(1); });
