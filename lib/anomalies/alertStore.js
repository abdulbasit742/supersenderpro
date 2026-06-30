// lib/anomalies/alertStore.js — deduped alert ledger.
const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.ALERTS_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'alerts');
const FILE = path.join(DATA_DIR, 'alerts.json');
function read() { try { if (!fs.existsSync(FILE)) return { alerts: [] }; return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { alerts: [] }; } }
function write(d) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); } catch {} }
function dedupeKey(storeId, a) { return `${storeId}:${a.metric}:${a.date}:${a.direction}`; }
function addNew(storeId, alerts) { const d = read(); d.alerts = d.alerts || []; const seen = new Set(d.alerts.map((x) => x.key)); const fresh = []; for (const a of alerts) { const key = dedupeKey(storeId, a); if (seen.has(key)) continue; const rec = { ...a, storeId, key, createdAt: new Date().toISOString(), acknowledged: false }; d.alerts.unshift(rec); seen.add(key); fresh.push(rec); } if (d.alerts.length > 2000) d.alerts = d.alerts.slice(0, 2000); write(d); return fresh; }
function list(storeId, { limit = 100, includeAcknowledged = true } = {}) { const d = read(); let a = (d.alerts || []).filter((x) => !storeId || x.storeId === storeId); if (!includeAcknowledged) a = a.filter((x) => !x.acknowledged); return a.slice(0, limit); }
function acknowledge(key) { const d = read(); const a = (d.alerts || []).find((x) => x.key === key); if (a) { a.acknowledged = true; a.acknowledgedAt = new Date().toISOString(); write(d); } return a || null; }
module.exports = { addNew, list, acknowledge, DATA_DIR };
