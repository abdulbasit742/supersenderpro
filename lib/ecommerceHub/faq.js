'use strict';

/**
 * Ecommerce Hub — FAQ / auto-reply knowledge base.
 * Editable list of { keywords:[], answer } entries. handle() matches an
 * incoming message against keywords and returns an answer; !faq lists topics.
 * Seeds sensible PK ecommerce defaults on first run. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_FAQ_PATH || 'data/ecommerce-faq.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }

function seed() {
  return { version: 1, entries: [
    { id: 'delivery', keywords: ['delivery', 'kitne din', 'kab aye ga', 'kab milega', 'shipping time'], answer: 'Delivery aam tor par 2-4 working days mein ho jaati hai. Order ke baad tracking aapko WhatsApp pe mil jayegi.' },
    { id: 'cod', keywords: ['cod', 'cash on delivery', 'cash', 'payment'], answer: 'Ji haan, Cash on Delivery available hai. Order pe hum confirm ke liye message karte hain.' },
    { id: 'return', keywords: ['return', 'wapsi', 'refund', 'exchange'], answer: 'Product mein masla ho to 7 din mein return/exchange ho sakta hai. Order ID ke saath rabta karein.' },
    { id: 'charges', keywords: ['delivery charges', 'shipping cost', 'kitna extra', 'fee'], answer: 'Delivery charges order value aur city par depend karte hain, checkout pe show ho jaate hain.' },
    { id: 'contact', keywords: ['contact', 'rabta', 'help', 'support', 'number'], answer: 'Hum yahin WhatsApp pe available hain. Apna sawaal likhein ya order ID share karein.' }
  ], updatedAt: null };
}
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!Array.isArray(s.entries)) s.entries = seed().entries; return s; } catch (_e) { const s = seed(); write(s); return s; } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function match(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  const entries = read().entries;
  let best = null, bestScore = 0;
  entries.forEach(function (e) {
    let score = 0;
    (e.keywords || []).forEach(function (kw) { if (t.indexOf(String(kw).toLowerCase()) !== -1) score++; });
    if (score > bestScore) { bestScore = score; best = e; }
  });
  return bestScore > 0 ? best : null;
}

function answer(text) { const e = match(text); return e ? e.answer : null; }
function listReply() {
  const entries = read().entries;
  if (!entries.length) return 'FAQ abhi empty hai.';
  const lines = entries.map(function (e) { return '\u2022 ' + (e.keywords && e.keywords[0] ? e.keywords[0] : e.id); });
  return '\u2139\ufe0f *Aksar pooche jane wale sawaal:*\n\n' + lines.join('\n') + '\n\nApna sawaal seedha likhein, hum jawab denge.';
}
function add(keywords, ans) {
  const s = read();
  s.entries.push({ id: 'custom' + Date.now(), keywords: keywords || [], answer: ans || '' });
  write(s); return s.entries.length;
}
function list() { return read().entries; }

module.exports = { answer, match, listReply, add, list };
