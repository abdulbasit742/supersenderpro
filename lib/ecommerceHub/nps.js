'use strict';

/**
 * Ecommerce Hub — NPS (0-10) capture post-delivery.
 * ask(): send the 0-10 question; handleReply(): capture a 0-10 score + comment;
 * summary(): promoters/passives/detractors + NPS. Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_NPS_PATH || 'data/ecommerce-nps.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, pending: {}, scores: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.pending) s.pending = {}; if (!s.scores) s.scores = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

async function ask(rec) {
  const r = rec || {}; if (!r.buyerPhone) return { ok: false, error: 'buyerPhone_required' };
  const s = read(); s.pending[normNum(r.buyerPhone)] = { orderId: r.orderId || null, at: Date.now() }; write(s);
  const sent = await notify.send(r.buyerPhone, 'Aap hamein 0 se 10 tak kitna recommend karenge? (0 = bilkul nahi, 10 = zaroor). Apna number likhein.');
  return { ok: true, notified: sent };
}

async function handleReply(text, fromPhone) {
  const k = normNum(fromPhone); const s = read(); const pend = s.pending[k];
  if (!pend) return null;
  const m = String(text || '').trim().match(/\b(10|[0-9])\b/);
  if (!m) return 'Meherbani 0 se 10 tak ka number likhein.';
  const n = Number(m[1]);
  const comment = String(text).replace(/\b(10|[0-9])\b/, '').trim();
  s.scores.push({ phone: k, orderId: pend.orderId, score: n, comment: comment || null, at: Date.now() });
  delete s.pending[k]; write(s);
  if (n <= 6) return 'Shukriya. Maazrat agar kami rahi, hum behtar karenge \ud83d\ude4f';
  if (n <= 8) return 'Shukriya feedback ke liye!';
  return 'Bohat shukriya! \ud83d\ude4c Apne doston ko bhi bataaiye.';
}

function summary() {
  const sc = read().scores;
  const total = sc.length;
  if (!total) return { ok: true, total: 0, nps: 0 };
  const prom = sc.filter(function (x) { return x.score >= 9; }).length;
  const det = sc.filter(function (x) { return x.score <= 6; }).length;
  const nps = Math.round(((prom - det) / total) * 100);
  return { ok: true, total: total, promoters: prom, passives: total - prom - det, detractors: det, nps: nps };
}

module.exports = { ask, handleReply, summary };
