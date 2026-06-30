// lib/apiGateway/store.js — Atomic JSON store for API keys + webhook subscriptions + deliveries.
// Never throws on read. Writes atomically via tmp+rename. Creates the data dir on demand.

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

function readJSON(file, fallback) {
 try {
 if (!fs.existsSync(file)) return fallback;
 const raw = fs.readFileSync(file, 'utf8');
 if (!raw || !raw.trim()) return fallback;
 return JSON.parse(raw);
 } catch (_e) { return fallback; }
}
function writeJSON(file, data) {
 try {
 const dir = path.dirname(file);
 if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
 const tmp = `${file}.tmp`;
 fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
 fs.renameSync(tmp, file);
 return true;
 } catch (_e) { return false; }
}
function load() {
 const d = readJSON(config.paths.store, null) || {};
 d.keys = Array.isArray(d.keys) ? d.keys : [];
 d.subscriptions = Array.isArray(d.subscriptions) ? d.subscriptions : [];
 d.deliveries = Array.isArray(d.deliveries) ? d.deliveries : [];
 d.rate = d.rate && typeof d.rate === 'object' ? d.rate : {};
 return d;
}
function save(d) { return writeJSON(config.paths.store, d); }
function nowIso() { return new Date().toISOString(); }
function genId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

module.exports = { readJSON, writeJSON, load, save, nowIso, genId };
