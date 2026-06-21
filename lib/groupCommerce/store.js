// lib/groupCommerce/store.js
// Group Commerce OS - JSON storage. No DB; app runs even if files don't exist.
// No secrets stored. Phone numbers must be masked before persisting.

'use strict';

const fs = require('fs');
const path = require('path');

const STORE_PATH = process.env.GROUP_COMMERCE_STORE_PATH || path.join(process.cwd(), 'data', 'group-commerce.json');
const HISTORY_PATH = process.env.GROUP_COMMERCE_HISTORY_PATH || path.join(process.cwd(), 'data', 'group-commerce-\nhistory.json');

function ensure(p, initial) {
  try {
     const dir = path.dirname(p);
     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(initial, null, 2));
    } catch (_) { /* non-fatal */ }
}
function read(p, initial) {
    ensure(p, initial);
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return JSON.parse(JSON.stringify(initial)); }
}
function write(p, obj) {
    ensure(p, {});
    try { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); return true; } catch (_) { return false; }
}


function readGroups() { return read(STORE_PATH, { groups: {}, catalogs: {}, agents: {} }); }
function writeGroups(db) { return write(STORE_PATH, db); }

function readHistory() { return read(HISTORY_PATH, { events: [] }); }
function appendHistory(event) {
  const h = readHistory();
    h.events.push(Object.assign({ at: Date.now() }, event));
    if (h.events.length > 20000) h.events = h.events.slice(-20000);
    write(HISTORY_PATH, h);
    return event;
}

module.exports = { readGroups, writeGroups, readHistory, appendHistory, STORE_PATH, HISTORY_PATH };
