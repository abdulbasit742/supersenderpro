'use strict';

/**
    * Incident Command — incident records + health snapshot + history (JSON files).
    * Local state only. ack/resolve/snooze mutate THIS store only, nothing else.
    */


const crypto = require('crypto');
const store = require('./store');
const guard = require('./safetyGuard');
const sev = require('./severityEngine');


const STORE_PATH = process.env.INCIDENT_COMMAND_STORE_PATH || 'data/incident-command.json';
const HISTORY_PATH = process.env.INCIDENT_COMMAND_HISTORY_PATH || 'data/incident-command-history.json';
const MAX_HISTORY = parseInt(process.env.INCIDENT_COMMAND_MAX_HISTORY, 10) || 1000;

function id(prefix) { return (prefix || 'inc_') + crypto.randomBytes(7).toString('hex'); }
function now() { return new Date().toISOString(); }

function readDb() { return store.read(STORE_PATH, { health: [], incidents: [] }); }
function writeDb(db) { return store.write(STORE_PATH, db); }
function readHistory() { return store.read(HISTORY_PATH, { events: [] }); }
function appendHistory(event) {
     const h = readHistory();
     h.events.push(Object.assign({ at: now() }, guard.redact(event)));
     if (h.events.length > MAX_HISTORY) h.events = h.events.slice(-MAX_HISTORY);
     store.write(HISTORY_PATH, h);
     return event;
}


// -------------------- health snapshot --------------------
function saveHealth(records) {
  const db = readDb();
     db.health = (Array.isArray(records) ? records : []).map(guard.redact);
     writeDb(db);
     return db.health;
}
function getHealth() { return readDb().health; }

// -------------------- incidents --------------------
function normalizeIncident(input) {
   const i = input || {};
   return guard.redact({
     id: i.id || id('inc_'),
     moduleId: i.moduleId || null,
     moduleName: i.moduleName || null,
     status: sev.normalizeStatus(i.status),
     severity: sev.normalizeSeverity(i.severity || sev.severityForStatus(i.status)),
     category: sev.normalizeCategory(i.category),
     summary: String(i.summary || '').slice(0, 240),
     detailsSafe: i.detailsSafe ? String(i.detailsSafe).slice(0, 1000) : null,
     affectedRoutes: Array.isArray(i.affectedRoutes) ? i.affectedRoutes.slice(0, 20) : [],
     affectedFiles: Array.isArray(i.affectedFiles) ? i.affectedFiles.slice(0, 40) : [],
     recommendedFix: i.recommendedFix ? String(i.recommendedFix).slice(0, 500) : null,
     runbookId: i.runbookId || null,
     state: ['open', 'ack', 'resolved', 'snoozed'].indexOf(i.state) !== -1 ? i.state : 'open',
     snoozedUntil: i.snoozedUntil || 0,
     createdAt: i.createdAt || now(),
     updatedAt: now(),
   });
}

function createIncident(input) {
   const db = readDb();
   const rec = normalizeIncident(input);
   db.incidents.push(rec);
   writeDb(db);
   appendHistory({ action: 'incident_created', id: rec.id, severity: rec.severity, category: rec.category });
   return rec;
}
function listIncidents() { return readDb().incidents.slice(); }
function getIncident(incId) { return readDb().incidents.find(function (x) { return x.id === incId; }) || null; }

function setState(incId, state, extra) {
 const db = readDb();
   const idx = db.incidents.findIndex(function (x) { return x.id === incId; });
   if (idx === -1) return null;
   db.incidents[idx] = Object.assign({}, db.incidents[idx], extra || {}, { state: state, updatedAt: now() });
   writeDb(db);
   appendHistory({ action: 'incident_' + state, id: incId });
   return db.incidents[idx];
}


function ack(incId) { return setState(incId, 'ack'); }
function resolve(incId) { return setState(incId, 'resolved'); }
function snooze(incId, minutes) {
 const m = Math.max(1, parseInt(minutes, 10) || 60);
   return setState(incId, 'snoozed', { snoozedUntil: Date.now() + m * 60000 });
}


function statusInfo() {
   return {
     storePath: STORE_PATH, historyPath: HISTORY_PATH,
     writable: store.writable(STORE_PATH), maxHistory: MAX_HISTORY,
     incidents: readDb().incidents.length, healthRecords: readDb().health.length,

    };
}

module.exports = {
 saveHealth, getHealth,
    createIncident, listIncidents, getIncident, ack, resolve, snooze, setState,
    readHistory, appendHistory, statusInfo, normalizeIncident,
};
