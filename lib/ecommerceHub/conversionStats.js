'use strict';

/**
 * Ecommerce Hub — abandoned-cart -> order conversion stats (read-only).
 * Reads the carts store + COD/tracking signals to estimate how many nudged
 * carts converted (recovered=true). Pure read of existing JSON state.
 */

const fs = require('fs');
const path = require('path');

function cartsPath() { const p = process.env.ECOMMERCE_HUB_CART_PATH || 'data/ecommerce-carts.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return null; } }

function build() {
  const c = readJson(cartsPath());
  const carts = c && c.carts ? Object.keys(c.carts).map(function (k) { return c.carts[k]; }) : [];
  const total = carts.length;
  const nudged = carts.filter(function (x) { return x.nudged; }).length;
  const recovered = carts.filter(function (x) { return x.recovered; }).length;
  const recoveryRate = nudged ? Math.round((recovered / nudged) * 100) : 0;
  return { ok: true, totalCarts: total, nudged: nudged, recovered: recovered, recoveryRatePct: recoveryRate };
}

module.exports = { build };
