'use strict';

/**
 * Ecommerce Hub — proof of delivery (POD) capture.
 * record(): store a POD reference (photo URL / signature note / OTP) for an
 * order at delivery time. get(): retrieve. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');
function storePath() { const p = process.env.ECOMMERCE_HUB_POD_PATH || 'data/ecommerce-pod.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, pod: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.pod) s.pod = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function record(orderId, proof) { if (!orderId) return { ok: false, error: 'orderId_required' }; const s = read(); s.pod[orderId] = { orderId: orderId, photoUrl: (proof && proof.photoUrl) || null, note: (proof && proof.note) || null, receivedBy: (proof && proof.receivedBy) || null, at: Date.now() }; write(s); return { ok: true, pod: s.pod[orderId] }; }
function get(orderId) { return read().pod[orderId] || null; }
module.exports = { record, get };
