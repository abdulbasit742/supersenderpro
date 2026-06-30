// lib/experiments/experimentStore.js
// JSON-backed store for experiments + per-recipient assignments + outcome events.
// Same defensive pattern as txnStore/queueManager: never throws, JSON file is
// the source of truth so the dashboard works with or without Redis/Postgres.
//
// Shape:
//   experiments.json -> { experiments: [ { id, storeId, name, metric, variants:[{key,label,template,weight}], status, winner, createdAt } ] }
//   assignments.json -> { byKey: { "storeId:expId:phone": { variant, ts } } }
//   events.json      -> { events: [ { storeId, expId, phone, variant, type, ts } ] }  (type: sent|delivered|replied|ordered)

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.EXPERIMENTS_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'experiments');
const EXP_FILE = path.join(DATA_DIR, 'experiments.json');
const ASSIGN_FILE = path.join(DATA_DIR, 'assignments.json');
const EVENT_FILE = path.join(DATA_DIR, 'events.json');

function read(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function write(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch {
    /* best-effort */
  }
}

// --- Experiments ------------------------------------------------------------
function listExperiments(storeId) {
  const all = read(EXP_FILE, { experiments: [] }).experiments || [];
  return storeId ? all.filter((e) => e.storeId === storeId) : all;
}
function getExperiment(id) {
  return (read(EXP_FILE, { experiments: [] }).experiments || []).find((e) => e.id === id) || null;
}
function saveExperiment(exp) {
  const data = read(EXP_FILE, { experiments: [] });
  data.experiments = data.experiments || [];
  const idx = data.experiments.findIndex((e) => e.id === exp.id);
  if (idx >= 0) data.experiments[idx] = exp;
  else data.experiments.unshift(exp);
  write(EXP_FILE, data);
  return exp;
}

// --- Assignments (sticky: a phone always gets the same variant) -------------
function getAssignment(storeId, expId, phone) {
  const data = read(ASSIGN_FILE, { byKey: {} });
  return (data.byKey || {})[`${storeId}:${expId}:${phone}`] || null;
}
function setAssignment(storeId, expId, phone, variant) {
  const data = read(ASSIGN_FILE, { byKey: {} });
  data.byKey = data.byKey || {};
  const rec = { variant, ts: new Date().toISOString() };
  data.byKey[`${storeId}:${expId}:${phone}`] = rec;
  write(ASSIGN_FILE, data);
  return rec;
}

// --- Outcome events ---------------------------------------------------------
function addEvent(evt) {
  const data = read(EVENT_FILE, { events: [] });
  data.events = data.events || [];
  data.events.push({ ...evt, ts: evt.ts || new Date().toISOString() });
  if (data.events.length > 50000) data.events = data.events.slice(-50000);
  write(EVENT_FILE, data);
  return evt;
}
function getEvents(storeId, expId) {
  const all = read(EVENT_FILE, { events: [] }).events || [];
  return all.filter((e) => e.storeId === storeId && e.expId === expId);
}

module.exports = {
  DATA_DIR,
  listExperiments, getExperiment, saveExperiment,
  getAssignment, setAssignment,
  addEvent, getEvents,
};
