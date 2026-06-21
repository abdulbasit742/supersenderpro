 'use strict';

 /**
     * JSON-file history store for the WhatsApp Cloud Setup Wizard.
     * - No database.
     * - Stores ONLY safe, masked data. Never tokens, never full phone numbers, never full payloads/PII.
     * - Defensive: never throws on read/write.
     */

 const fs = require('fs');
 const path = require('path');
 const crypto = require('crypto');

 const STORE_PATH = process.env.WHATSAPP_CLOUD_SETUP_HISTORY_PATH || 'data/whatsapp-cloud-setup-history.json';
 const MAX_HISTORY = parseInt(process.env.WHATSAPP_CLOUD_SETUP_MAX_HISTORY, 10) || 300;

 function resolvePath() {
      // relative to repo root (process.cwd()), never absolute/hardcoded
      return path.join(process.cwd(), STORE_PATH);
 }

 function ensureFile() {
   try {
          const p = resolvePath();
          const dir = path.dirname(p);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({ entries: [] }, null, 2), 'utf8');
      } catch (e) { /* defensive: ignore */ }
 }

 function read() {
      ensureFile();
      try {
          const parsed = JSON.parse(fs.readFileSync(resolvePath(), 'utf8'));
          if (!Array.isArray(parsed.entries)) parsed.entries = [];
        return parsed;
      } catch (e) {
          return { entries: [] };
      }
 }


 function write(data) {
   try {
          if (data.entries && data.entries.length > MAX_HISTORY) {
            data.entries = data.entries.slice(data.entries.length - MAX_HISTORY);
          }
          fs.writeFileSync(resolvePath(), JSON.stringify(data, null, 2), 'utf8');

      return true;
  } catch (e) {
    return false;
  }
}

function id() {
  return crypto.randomBytes(8).toString('hex');
}

// Strip anything that could be sensitive before persisting.
function sanitize(entry) {
entry = entry || {};
  return {
    id: id(),
      timestamp: new Date().toISOString(),
      action: String(entry.action || 'unknown').slice(0, 64),
      dryRun: entry.dryRun !== false, // default true
      status: String(entry.status || 'ok').slice(0, 32),
      message: String(entry.message || '').slice(0, 240),
      maskedTarget: entry.maskedTarget ? String(entry.maskedTarget).slice(0, 16) : null,
      templateName: entry.templateName ? String(entry.templateName).slice(0, 64) : null,
      warnings: Array.isArray(entry.warnings) ? entry.warnings.slice(0, 20).map(function (w) { return String(w).slice(0,
200); }) : [],
};
}


function record(entry) {
const safe = sanitize(entry);
  const data = read();
  data.entries.push(safe);
  write(data);
  return safe;
}

function list(limit) {
const items = read().entries.slice().reverse();
  return typeof limit === 'number' ? items.slice(0, limit) : items;
}


function remove(itemId) {
  const data = read();
  const before = data.entries.length;
  data.entries = data.entries.filter(function (e) { return e.id !== itemId; });
  write(data);
  return before !== data.entries.length;
}


function status() {
  ensureFile();
  let writable = false;
  try { fs.accessSync(resolvePath(), fs.constants.W_OK); writable = true; } catch (e) { writable = false; }
  return { path: STORE_PATH, writable: writable, entries: read().entries.length, maxHistory: MAX_HISTORY };
}


module.exports = { record, list, remove, status, sanitize };
