'use strict';

/**
 * Ecommerce Hub — saved quick-reply templates for agents.
 * Canned responses with shortcodes (e.g. /delivery, /cod) an agent can expand.
 * Seeds PK defaults; editable. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_QR_PATH || 'data/ecommerce-quickreplies.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function seed() { return { version: 1, templates: {
  '/delivery': 'Delivery 2-4 working days mein ho jaati hai, tracking WhatsApp pe milegi.',
  '/cod': 'Ji, Cash on Delivery available hai.',
  '/thanks': 'Shukriya! Aap se dobara order ki umeed hai \ud83d\ude4f',
  '/return': 'Return 7 din mein ho sakta hai. Order ID share karein.'
}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.templates) s.templates = seed().templates; return s; } catch (_e) { const s = seed(); write(s); return s; } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function expand(code) { return read().templates[String(code || '').toLowerCase()] || null; }
function set(code, text) { const s = read(); s.templates[String(code).toLowerCase()] = String(text); write(s); return true; }
function list() { return read().templates; }

module.exports = { expand, set, list };
