'use strict';
// Self-check for the churn predictor subsystem. No network, no model needed.
const cfg = require('./config');
const core = require('./index');

async function check() {
  const out = { name: 'churnPredictor', ok: true, details: {} };
  try {
    const now = Date.now();
    const fresh = core.scoreContact({ phone: '923001234567', lastOrderAt: new Date(now).toISOString(), orderCount: 12, lifetimeValue: 80000, recentReplies: 4 }, now);
    const stale = core.scoreContact({ phone: '923009999999', lastOrderAt: new Date(now - 120 * 864e5).toISOString(), orderCount: 1, lifetimeValue: 500, recentReplies: 0 }, now);
    out.details.freshScore = fresh.score;
    out.details.staleScore = stale.score;
    out.details.ordersOk = stale.score > fresh.score;
    out.details.masks = core.maskPhone('923001234567');
    if (!(stale.score > fresh.score)) { out.ok = false; out.error = 'scoring not monotonic'; }
    if (out.details.masks.includes('1234')) { out.ok = false; out.error = 'phone not masked'; }
    out.details.threshold = cfg.riskThreshold;
  } catch (e) {
    out.ok = false; out.error = e.message;
  }
  return out;
}

module.exports = { check };
