// lib/consentCenter/store.js — Atomic JSON store for the consent center. Never throws on read.
// Writes atomically via tmp+rename. Creates the data dir on demand.

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
 // consent: { [contactToken]: { status, updatedAt, source } }
 d.consent = d.consent && typeof d.consent === 'object' ? d.consent : {};
 d.log = Array.isArray(d.log) ? d.log : [];
 return d;
}
function save(d) { return writeJSON(config.paths.store, d); }
function nowIso() { return new Date().toISOString(); }
function genId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

module.exports = { readJSON, writeJSON, load, save, nowIso, genId };
