// lib/senderHealth/numberRegistry.js — Track per-number state: registration date (for warmup),
// rolling daily/hourly counters, last-send timestamp, health score, and block/complaint tallies.
// A number is created on first reference. Counters reset lazily by day/hour bucket.

const store = require('./store');

function _maskNumber(n) { const s = String(n).replace(/[^0-9+]/g, ''); return s.length <= 4 ? '****' : s.slice(0, 3) + '****' + s.slice(-2); }
function _dayBucket(ms) { const d = new Date(ms); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; }
function _hourBucket(ms) { return Math.floor(ms / 3600000); }

function _ensure(d, number, refNow) {
 const key = String(number);
 if (!d.numbers[key]) {
 d.numbers[key] = {
 number: key, masked: _maskNumber(key),
 registeredAt: new Date(refNow).toISOString(),
 dayBucket: _dayBucket(refNow), daySent: 0,
 hourBucket: _hourBucket(refNow), hourSent: 0,
 lastSendAt: null, totalSent: 0,
 blocks: 0, complaints: 0, score: 100,
 status: 'active',
 };
 }
 const rec = d.numbers[key];
 // Lazy reset of rolling counters.
 const day = _dayBucket(refNow); if (rec.dayBucket !== day) { rec.dayBucket = day; rec.daySent = 0; }
 const hour = _hourBucket(refNow); if (rec.hourBucket !== hour) { rec.hourBucket = hour; rec.hourSent = 0; }
 return rec;
}

function get(number, refNow = Date.now()) { const d = store.load(); const rec = _ensure(d, number, refNow); store.save(d); return rec; }
function ageDays(rec, refNow = Date.now()) { return Math.floor((refNow - Date.parse(rec.registeredAt)) / 86400000); }

function recordSend(number, refNow = Date.now()) {
 const d = store.load(); const rec = _ensure(d, number, refNow);
 rec.daySent += 1; rec.hourSent += 1; rec.totalSent += 1; rec.lastSendAt = new Date(refNow).toISOString();
 // Clean sends slowly recover score (cap 100).
 if (rec.score < 100) rec.score = Math.min(100, rec.score + 0.2);
 store.save(d); return rec;
}
function recordBlock(number, n = 1) {
 const d = store.load(); const rec = _ensure(d, number, Date.now());
 rec.blocks += n; store.save(d); return rec;
}
function recordComplaint(number, n = 1) {
 const d = store.load(); const rec = _ensure(d, number, Date.now());
 rec.complaints += n; store.save(d); return rec;
}
function setStatus(number, status) {
 const d = store.load(); const rec = _ensure(d, number, Date.now());
 rec.status = status; store.save(d); return rec;
}
function all() { return Object.values(store.load().numbers); }
function publicView(rec) {
 if (!rec) return null;
 return { masked: rec.masked, registeredAt: rec.registeredAt, daySent: rec.daySent, hourSent: rec.hourSent, totalSent: rec.totalSent, blocks: rec.blocks, complaints: rec.complaints, score: Math.round(rec.score), status: rec.status, lastSendAt: rec.lastSendAt };
}

module.exports = { get, ageDays, recordSend, recordBlock, recordComplaint, setStatus, all, publicView, _maskNumber };
