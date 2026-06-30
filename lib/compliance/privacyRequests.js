'use strict';
/**
 * privacyRequests.js — Compliance Feature #2: data access + erasure requests.
 *
 * A contactable SaaS must be able to (a) export everything it holds on a person, and (b) erase them
 * on request (right-to-be-forgotten). This orchestrates both across all data modules via injected
 * collectors/erasers, and logs every request so you can prove compliance.
 *
 * Sources are injected so this stays decoupled:
 *   registerSource(name, { collect(phone)=>data, erase(phone)=>count })
 * Storage: JSON (data/privacy_requests.json) for the request log.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'privacy_requests.json');

const sources = {}; // name -> { collect?, erase? }
function registerSource(name, handlers = {}) {
  if (!name) return;
  sources[name] = {
    collect: typeof handlers.collect === 'function' ? handlers.collect : null,
    erase: typeof handlers.erase === 'function' ? handlers.erase : null
  };
  return Object.keys(sources);
}

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { requests: [] }; }
  catch { return { requests: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function logRequest(entry) {
  const data = load();
  data.requests.push({ id: `PRIV-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, ...entry, at: nowIso() });
  if (data.requests.length > 5000) data.requests = data.requests.slice(-5000);
  save(data);
}

/** Export everything held on a contact across all registered sources. */
async function exportData(phone) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const out = {};
  for (const [name, s] of Object.entries(sources)) {
    if (!s.collect) continue;
    try { out[name] = await s.collect(p); } catch (e) { out[name] = { error: e.message }; }
  }
  logRequest({ type: 'access', phone: p, sources: Object.keys(out) });
  return { phone: p, data: out, generatedAt: nowIso() };
}

/** Erase a contact from all registered sources (right-to-be-forgotten). */
async function eraseData(phone) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const results = {};
  for (const [name, s] of Object.entries(sources)) {
    if (!s.erase) continue;
    try { results[name] = await s.erase(p); } catch (e) { results[name] = { error: e.message }; }
  }
  logRequest({ type: 'erase', phone: p, sources: Object.keys(results) });
  return { phone: p, erased: results, completedAt: nowIso() };
}

function listRequests(limit = 100) {
  return load().requests.slice(-Math.max(1, Number(limit) || 100)).reverse();
}
function registeredSources() { return Object.keys(sources); }

module.exports = { registerSource, exportData, eraseData, listRequests, registeredSources };
