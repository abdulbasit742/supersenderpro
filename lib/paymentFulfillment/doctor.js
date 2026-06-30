// lib/paymentFulfillment/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');

let saas = null; try { saas = require('../saasBilling'); } catch (_e) { saas = null; }
let gw = null; try { gw = require('../paymentGateway'); } catch (_e) { gw = null; }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('saasBilling_available', !!saas);
 ok('paymentGateway_available', !!gw);
 ok('store_readable', Array.isArray(d.fulfillments));
 ok('safe_default', config.dryRun === true || config.effective.liveFulfillment === true,
 config.dryRun ? 'dry-run on' : 'live fulfillment explicitly enabled');
 let gateway = null; try { gateway = gw ? gw.getStatus() : null; } catch (_e) { gateway = null; }
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 dryRun: config.dryRun,
 liveFulfillment: config.effective.liveFulfillment,
 liveNotifications: config.effective.liveNotifications,
 reminderOffsetsDays: config.reminderOffsetsDays,
 },
 gateway,
 counts: {
 fulfillments: d.fulfillments.length,
 receipts: d.receipts.length,
 reminders: d.reminders.length,
 processedEvents: d.processedEvents.length,
 },
 checks,
 };
}

module.exports = { run };
