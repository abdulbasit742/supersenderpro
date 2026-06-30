'use strict';

/**
 * Ecommerce Hub — multi-step drip (welcome/onboarding).
 * enroll(): start a contact on a named sequence. tick(): advance everyone whose
 * next step is due and send it (opt-out safe via broadcast-style send).
 * Sequences are defined in DRIP_SEQUENCES env JSON or a sensible default.
 * Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');
const optOut = require('./optOutStore');

function storePath() { const p = process.env.ECOMMERCE_HUB_DRIP_PATH || 'data/ecommerce-drip.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, enrollments: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!Array.isArray(s.enrollments)) s.enrollments = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function sequences() {
  try { const s = JSON.parse(process.env.DRIP_SEQUENCES || ''); if (s && typeof s === 'object') return s; } catch (_e) {}
  return {
    welcome: [
      { delayHours: 0, text: 'Welcome! Hamare store mein khushamdeed \ud83c\udf89 *!shop* likh ke products dekhein.' },
      { delayHours: 24, text: 'Pehli khareedari pe 10% off \u2014 *!coupon* likhein code lene ke liye.' },
      { delayHours: 72, text: 'Koi sawaal? *!faq* likhein ya seedha message karein, hum yahin hain.' }
    ]
  };
}

function enroll(phone, sequence) {
  const k = normNum(phone); if (!k) return { ok: false, error: 'phone_required' };
  const seq = sequence || 'welcome';
  if (!sequences()[seq]) return { ok: false, error: 'unknown_sequence' };
  const s = read();
  if (s.enrollments.find(function (e) { return e.phone === k && e.sequence === seq && e.status === 'active'; })) return { ok: true, already: true };
  s.enrollments.push({ phone: k, sequence: seq, step: 0, status: 'active', enrolledAt: Date.now(), nextAt: Date.now() });
  write(s);
  return { ok: true };
}

async function tick() {
  const s = read(); const now = Date.now(); const seqs = sequences(); const out = [];
  for (const e of s.enrollments) {
    if (e.status !== 'active') continue;
    if (optOut.isOptedOut(e.phone)) { e.status = 'stopped'; continue; }
    const steps = seqs[e.sequence] || [];
    if (e.step >= steps.length) { e.status = 'done'; continue; }
    if (e.nextAt > now) continue;
    const step = steps[e.step];
    await notify.send(e.phone, step.text);
    e.step += 1;
    if (e.step >= steps.length) { e.status = 'done'; }
    else { e.nextAt = now + (Number(steps[e.step].delayHours || 24) * 3600000); }
    out.push({ phone: e.phone, sequence: e.sequence, sentStep: e.step });
  }
  write(s);
  return { ok: true, sent: out.length, details: out };
}

module.exports = { enroll, tick, sequences };
