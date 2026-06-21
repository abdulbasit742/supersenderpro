'use strict';

/**
 * Privacy Center — privacy request CRUD service (JSON file). Local state only.
    */


const store = require('./store');
const model = require('./privacyRequestModel');


const STORE_PATH = process.env.PRIVACY_CENTER_STORE_PATH || 'data/privacy-center.json';

function read() { return store.read(STORE_PATH, { requests: [] }); }
function write(db) { return store.write(STORE_PATH, db); }


function create(input) { const db = read(); const rec = model.normalize(input); db.requests.push(rec); write(db); return
rec; }
function list() { return read().requests.slice(); }
function get(rid) { return read().requests.find(function (r) { return r.id === rid; }) || null; }
function update(rid, patch) {
  const db = read();
     const idx = db.requests.findIndex(function (r) { return r.id === rid; });
     if (idx === -1) return null;
     // re-run normalize so PII fields stay masked
     const merged = Object.assign({}, db.requests[idx], patch || {}, { id: rid, createdAt: db.requests[idx].createdAt });
     if (patch && (patch.requesterName || patch.phone || patch.email || patch.notes)) {
       merged.requesterName = patch.requesterName; merged.phone = patch.phone; merged.email = patch.email; merged.notes =
patch.notes;
  }
     db.requests[idx] = model.normalize(merged);
     write(db);
     return db.requests[idx];
}
function statusInfo() { return { path: STORE_PATH, writable: store.writable(STORE_PATH), requests: read().requests.length
}; }

module.exports = { create, list, get, update, statusInfo };
