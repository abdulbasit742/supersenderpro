'use strict';

/**
 * Ecommerce Hub — order timeline / audit log.
 * Append events to an order (created, confirmed, packed, shipped, delivered,
 * note, return...) so you have a full history. record()/get(). Persistent JSON.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_TIMELINE_PATH || 'data/ecommerce-timeline.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, timelines: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.timelines) s.timelines = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function key(platform, orderId) { return String(platform || 'generic') + ':' + String(orderId); }

function record(platform, orderId, event, meta) {
  if (!orderId) return false;
  const s = read(); const k = key(platform, orderId);
  s.timelines[k] = s.timelines[k] || [];
  s.timelines[k].push({ event: String(event || 'event'), meta: meta || null, at: Date.now() });
  return write(s);
}
function get(platform, orderId) { return read().timelines[key(platform, orderId)] || []; }
function reply(platform, orderId) {
  const t = get(platform, orderId);
  if (!t.length) return 'Is order ki koi history nahi mili.';
  const lines = t.map(function (e) { return '\u2022 ' + new Date(e.at).toISOString().slice(0, 16).replace('T', ' ') + ' \u2014 ' + e.event; });
  return '\ud83d\udcdc *Order ' + orderId + ' timeline*\n\n' + lines.join('\n');
}

module.exports = { record, get, reply };
