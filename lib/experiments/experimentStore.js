// lib/experiments/experimentStore.js — JSON store for experiments/assignments/events.
const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.EXPERIMENTS_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'experiments');
const EXP_FILE = path.join(DATA_DIR, 'experiments.json');
const ASSIGN_FILE = path.join(DATA_DIR, 'assignments.json');
const EVENT_FILE = path.join(DATA_DIR, 'events.json');
function read(f, fb) { try { if (!fs.existsSync(f)) return fb; return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } }
function write(f, d) { try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); } catch {} }
function listExperiments(storeId) { const all = read(EXP_FILE, { experiments: [] }).experiments || []; return storeId ? all.filter((e) => e.storeId === storeId) : all; }
function getExperiment(id) { return (read(EXP_FILE, { experiments: [] }).experiments || []).find((e) => e.id === id) || null; }
function saveExperiment(exp) { const d = read(EXP_FILE, { experiments: [] }); d.experiments = d.experiments || []; const i = d.experiments.findIndex((e) => e.id === exp.id); if (i >= 0) d.experiments[i] = exp; else d.experiments.unshift(exp); write(EXP_FILE, d); return exp; }
function getAssignment(storeId, expId, phone) { const d = read(ASSIGN_FILE, { byKey: {} }); return (d.byKey || {})[`${storeId}:${expId}:${phone}`] || null; }
function setAssignment(storeId, expId, phone, variant) { const d = read(ASSIGN_FILE, { byKey: {} }); d.byKey = d.byKey || {}; const r = { variant, ts: new Date().toISOString() }; d.byKey[`${storeId}:${expId}:${phone}`] = r; write(ASSIGN_FILE, d); return r; }
function addEvent(evt) { const d = read(EVENT_FILE, { events: [] }); d.events = d.events || []; d.events.push({ ...evt, ts: evt.ts || new Date().toISOString() }); if (d.events.length > 50000) d.events = d.events.slice(-50000); write(EVENT_FILE, d); return evt; }
function getEvents(storeId, expId) { const all = read(EVENT_FILE, { events: [] }).events || []; return all.filter((e) => e.storeId === storeId && e.expId === expId); }
module.exports = { DATA_DIR, listExperiments, getExperiment, saveExperiment, getAssignment, setAssignment, addEvent, getEvents };
