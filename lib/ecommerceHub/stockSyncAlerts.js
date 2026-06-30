'use strict';

/**
 * Ecommerce Hub — cross-platform stock mismatch alerts.
 * Uses unifiedInventory to find the same item with different stock across
 * platforms (likely out-of-sync) and alerts admin. Read-only. Dry-run safe.
 */

const unified = require('./unifiedInventory');
const notify = require('./orderNotify');
const cod = require('./codStore');

function adminNumbers() { return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(cod.normNum).filter(Boolean); }

async function scan() {
  const u = await unified.build();
  const mism = (u.rows || []).filter(function (r) {
    const stocks = Object.keys(r.platforms).map(function (p) { return r.platforms[p].stock; }).filter(function (x) { return x != null; });
    if (stocks.length < 2) return false;
    return Math.max.apply(null, stocks) !== Math.min.apply(null, stocks);
  });
  if (mism.length) {
    const lines = mism.slice(0, 15).map(function (r) { return '\u2022 ' + r.title + ': ' + Object.keys(r.platforms).map(function (p) { return p + '=' + r.platforms[p].stock; }).join(', '); });
    const msg = '\u26a0\ufe0f *Stock mismatch across platforms*\n\n' + lines.join('\n');
    for (const a of adminNumbers()) await notify.send(a, msg);
  }
  return { ok: true, mismatches: mism.length };
}

module.exports = { scan };
