'use strict';
// #86 Multi-Language & Localization — JSON-backed store (per-contact locale + translation memory).
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'localization.json');

function ensure() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
  if (!fs.existsSync(FILE)) { try { fs.writeFileSync(FILE, JSON.stringify({ contacts: {}, memory: {} }, null, 2)); } catch (_) {} }
}
function load() { ensure(); try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return { contacts: {}, memory: {} }; } }
function save(db) { ensure(); try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); return true; } catch (_) { return false; } }
function ckey(tenantId, contactId) { return `${tenantId || 'default'}:${contactId}`; }
module.exports = { load, save, ckey, FILE };
