'use strict';

/**
 * Ecommerce Hub — price-drop watch.
 * Keeps last-seen price per product; sweep() compares current catalog vs the
 * snapshot and, for any product whose price dropped, notifies wishlist watchers.
 * Dry-run safe via orderNotify.send. Persistent JSON snapshot.
 */

const fs = require('fs');
const path = require('path');
const registry = require('./registry');
const wishlist = require('./wishlist');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_PRICEWATCH_PATH || 'data/ecommerce-pricewatch.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, prices: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.prices) s.prices = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

async function sweep() {
  const products = await registry.allProducts();
  const s = read();
  const drops = [];
  for (const p of products) {
    const key = p.platform + ':' + p.id;
    const prev = s.prices[key];
    if (prev != null && p.price != null && p.price < prev) {
      const watchers = wishlist.watchersFor(p.id);
      for (const w of watchers) {
        await notify.send(w, '\ud83d\udd3b *Price drop!*\n' + p.title + '\n' + prev + ' \u2192 ' + (p.currency + ' ' + p.price) + (p.url ? ('\nBuy: ' + p.url) : '') + '\n\nWishlist se: reply STOP to mute.');
      }
      drops.push({ product: key, from: prev, to: p.price, watchers: watchers.length });
    }
    if (p.price != null) s.prices[key] = p.price;
  }
  write(s);
  return { ok: true, drops: drops.length, details: drops };
}

module.exports = { sweep };
