'use strict';

/**
 * Ecommerce Hub — returns analytics (read-only).
 * Reads the returns store and summarizes counts by status + top reasons, so you
 * can see WHY items come back (quality, size, wrong item...).
 */

const fs = require('fs');
const path = require('path');
function returnsPath() { const p = process.env.ECOMMERCE_HUB_RETURNS_PATH || 'data/ecommerce-returns.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function read() { try { return JSON.parse(fs.readFileSync(returnsPath(), 'utf8')); } catch (_e) { return { rmas: {} }; } }
function build() {
  const rmas = read().rmas || {};
  const list = Object.keys(rmas).map(function (k) { return rmas[k]; });
  const byStatus = {}; const byReason = {};
  list.forEach(function (r) { byStatus[r.status] = (byStatus[r.status] || 0) + 1; const reason = (r.reason || 'unspecified').toLowerCase().slice(0, 40); byReason[reason] = (byReason[reason] || 0) + 1; });
  const topReasons = Object.keys(byReason).map(function (k) { return { reason: k, count: byReason[k] }; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 10);
  return { ok: true, total: list.length, byStatus: byStatus, topReasons: topReasons };
}
module.exports = { build };
