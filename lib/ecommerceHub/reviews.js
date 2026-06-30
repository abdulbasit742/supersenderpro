'use strict';

/**
 * Ecommerce Hub — post-delivery review/rating request (all platforms).
 * requestReview(): after delivery, ask the buyer to rate 1-5. Pending stored by
 * phone so their next 1-5 reply is captured. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_REVIEW_PATH || 'data/ecommerce-reviews.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, pending: {}, reviews: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.pending) s.pending = {}; if (!s.reviews) s.reviews = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function askMsg(orderId) {
  return [
    'Aapka order *' + orderId + '* deliver ho chuka hai \ud83c\udf89',
    'Apna experience rate karein *1 se 5* tak (5 = bahterin).',
    'Aap chahein toh chhota sa comment bhi likh sakte hain.'
  ].join('\n');
}

async function requestReview(rec) {
  const r = rec || {};
  if (!r.orderId || !r.buyerPhone) return { ok: false, error: 'orderId_buyerPhone_required' };
  const s = read();
  s.pending[normNum(r.buyerPhone)] = { platform: r.platform || null, orderId: r.orderId, at: Date.now() };
  write(s);
  const sent = await notify.send(r.buyerPhone, askMsg(r.orderId));
  return { ok: true, orderId: r.orderId, notified: sent };
}

/**
 * handleReply(text, fromPhone) -> reply string or null. Captures a 1-5 rating
 * (optionally with a comment) if this buyer has a pending review request.
 */
async function handleReply(text, fromPhone) {
  const k = normNum(fromPhone);
  const s = read();
  const pend = s.pending[k];
  if (!pend) return null;
  const t = String(text || '').trim();
  const m = t.match(/[1-5]/);
  if (!m) return 'Apni rating *1 se 5* tak likhein (5 = bahterin).';
  const rating = Number(m[0]);
  const comment = t.replace(/^[1-5]\s*[-:.]?\s*/, '').trim();
  s.reviews.push({ platform: pend.platform, orderId: pend.orderId, phone: k, rating: rating, comment: comment || null, at: Date.now() });
  delete s.pending[k]; write(s);
  if (rating <= 3) return 'Shukriya feedback ke liye! Maazrat agar koi kami rahi. Hum behtar karenge \ud83d\ude4f';
  return 'Shukriya! \u2b50 ' + rating + '/5 rating ke liye mashkoor hain \ud83d\ude4c';
}

function list() { return read().reviews; }

module.exports = { requestReview, handleReply, list, askMsg };
