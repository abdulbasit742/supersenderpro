'use strict';
/**
 * lib/demoSandbox/store.js
    * JSON-file storage for demo config + tour state + history. Demo data only.
    * App runs even if files are missing. No secrets, no real PII.
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const STORE_PATH = process.env.DEMO_SANDBOX_STORE_PATH || 'data/demo-sandbox.json';
const HISTORY_PATH = process.env.DEMO_SANDBOX_HISTORY_PATH || 'data/demo-sandbox-history.json';
const abs = (p) => path.isAbsolute(p) ? p : path.join(ROOT, p);

function emptyState() { return { config: null, activeScenario: null, tourState: {}, version: 1 }; }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(abs(p), 'utf8')); } catch { return fb; } }
function writeJson(p, d) { try { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); } catch {}
fs.writeFileSync(abs(p), JSON.stringify(d, null, 2), 'utf8'); }

function load() { return readJson(STORE_PATH, emptyState()); }
function save(s) { writeJson(STORE_PATH, s); return load(); }
function appendHistory(entry) {
     const hist = readJson(HISTORY_PATH, []);
     hist.push(Object.assign({ at: new Date().toISOString() }, entry));
     writeJson(HISTORY_PATH, hist.slice(-1000));
}
function readHistory(limit = 200) { return readJson(HISTORY_PATH, []).slice(-limit).reverse(); }
module.exports = { emptyState, load, save, appendHistory, readHistory, paths: { STORE_PATH, HISTORY_PATH } };
