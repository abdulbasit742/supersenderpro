// lib/bulkImportExport/config.js — Safe config for the Bulk Import/Export department.
// JSON-backed like the rest of the app. Imports DEFAULT TO DRY-RUN: a job validates + previews
// every row and reports what WOULD happen, committing to the contact book only when explicitly
// asked (commit:true) AND a contacts library is present. Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.BULK_IMPORT_EXPORT_ENABLED, true),
 // Hard cap on rows processed per import job (protects the JSON store + memory).
 maxRows: num(process.env.BULK_IMPORT_EXPORT_MAX_ROWS, 50000),
 // How many import jobs to retain in history.
 maxJobHistory: num(process.env.BULK_IMPORT_EXPORT_MAX_JOB_HISTORY, 100),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.BULK_IMPORT_EXPORT_STORE_PATH, 'data/bulk-import-export.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
