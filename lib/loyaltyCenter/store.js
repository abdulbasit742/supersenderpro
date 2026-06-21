  'use strict';

  /** Loyalty Center — JSON store for loyalty customers, ledger, rules. */

  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  const ROOT = process.cwd();


  function abs(p, fb) { const r = (p && String(p).trim()) || fb; return path.isAbsolute(r) ? r : path.resolve(ROOT, r); }

  const PATHS = {
       customers: abs(process.env.LOYALTY_CUSTOMERS_PATH, 'data/loyalty-customers.json'),
       ledger: abs(process.env.LOYALTY_LEDGER_PATH, 'data/loyalty-ledger.json'),
       rules: abs(process.env.LOYALTY_RULES_PATH, 'data/loyalty-rules.json'),
  };

  function readJson(p, fb) { try { if (!fs.existsSync(p)) return fb; const raw = fs.readFileSync(p, 'utf8'); return
  raw.trim() ? JSON.parse(raw) : fb; } catch (_e) { return fb; } }
  function writeJson(p, data) { const dir = path.dirname(p); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); const tmp = p + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, p); }
  function genId(prefix) { return (prefix || 'id') + '_' + crypto.randomBytes(6).toString('hex'); }

  function readCustomers() { const d = readJson(PATHS.customers, { customers: [] }); return Array.isArray(d.customers) ?
  d.customers : []; }
  function writeCustomers(items) { writeJson(PATHS.customers, { customers: items, updatedAt: new Date().toISOString() }); }
  function readLedger() { const d = readJson(PATHS.ledger, { entries: [] }); return Array.isArray(d.entries) ? d.entries :
  []; }
  function writeLedger(items) { writeJson(PATHS.ledger, { entries: items, updatedAt: new Date().toISOString() }); }
  function readRules() { const d = readJson(PATHS.rules, { rules: [] }); return Array.isArray(d.rules) ? d.rules : []; }
  function writeRules(items) { writeJson(PATHS.rules, { rules: items, updatedAt: new Date().toISOString() }); }


  module.exports = { PATHS, readJson, writeJson, genId, readCustomers, writeCustomers, readLedger, writeLedger, readRules,
  writeRules, ROOT };
