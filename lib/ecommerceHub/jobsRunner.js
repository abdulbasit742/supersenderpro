'use strict';

/**
 * Ecommerce Hub — daily auto-jobs runner.
 * One runDaily() that fires all the periodic sweeps in order, so you only need
 * a single scheduled hit (or your existing interval) to keep everything live:
 *   abandoned-cart sweep, price-drop watch, back-in-stock, reorder reminders,
 *   drip tick, scheduled-broadcast run, and the admin daily digest.
 * Each is wrapped so one failure doesn't stop the rest. Dry-run safe throughout.
 */

const cart = require('./abandonedCart');
const priceWatch = require('./priceWatch');
const backInStock = require('./backInStock');
const reorder = require('./reorder');
const drip = require('./dripCampaign');
const scheduler = require('./scheduler');
const alerts = require('./alerts');

async function safe(name, fn) {
  try { const r = await fn(); return { job: name, ok: true, result: r }; }
  catch (e) { return { job: name, ok: false, error: e && e.message }; }
}

async function runDaily() {
  const out = [];
  out.push(await safe('abandonedCart', function () { return cart.sweep(); }));
  out.push(await safe('priceWatch', function () { return priceWatch.sweep(); }));
  out.push(await safe('backInStock', function () { return backInStock.sweep(); }));
  out.push(await safe('reorder', function () { return reorder.remind(); }));
  out.push(await safe('drip', function () { return drip.tick(); }));
  out.push(await safe('scheduler', function () { return scheduler.runDue(); }));
  out.push(await safe('dailyDigest', function () { return alerts.dailyDigest(); }));
  return { ok: true, ranAt: new Date().toISOString(), jobs: out };
}

module.exports = { runDaily };
