'use strict';

/**
 * Ecommerce Hub — abandoned-browse nudge.
 * track(): record that a buyer viewed a product (e.g. tapped !product) without
 * ordering. sweep(): nudge buyers who browsed but didn't buy within a window.
 * Persistent JSON. Dry-run safe. Opt-out honored.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');
const optOut = require('./optOutStore');
const productStore = require('./productStore');

function storePath() { const p = process.env.ECOMMERCE_HUB_BROWSE_PATH || 'data/ecommerce-browse.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, views: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.views) s.views = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function track(phone, productId) { const k = normNum(phone); if (!k || !productId) return false; const s = read(); s.views[k] = { productId: String(productId), at: Date.now(), nudged: false }; return write(s); }
function markOrdered(phone) { const k = normNum(phone); const s = read(); if (s.views[k]) { delete s.views[k]; write(s); } }
async function sweep() {
  const mins = Number(process.env.BROWSE_ABANDON_MINUTES || 120);
  const cutoff = Date.now() - mins * 60000;
  const s = read(); const out = [];
  for (const k of Object.keys(s.views)) {
    const v = s.views[k];
    if (v.nudged || v.at > cutoff) continue;
    if (optOut.isOptedOut(k)) { v.nudged = true; continue; }
    const p = productStore.findProduct(v.productId);
    const title = p ? p.title : ('product ' + v.productId);
    await notify.send(k, 'Aap ne ' + title + ' dekha tha \ud83d\udc40 Pasand aaya? *!product ' + v.productId + '* se order karein. Sawaal ho to pochein!');
    v.nudged = true; out.push(k);
  }
  write(s);
  return { ok: true, nudged: out.length };
}

module.exports = { track, markOrdered, sweep };
