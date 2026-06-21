  'use strict';

  /** Business Alerts — JSON store for alerts + rules. */

  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  const ROOT = process.cwd();
  function abs(p, fb) { const r = (p && String(p).trim()) || fb; return path.isAbsolute(r) ? r : path.resolve(ROOT, r); }


  const PATHS = {
       alerts: abs(process.env.BUSINESS_ALERTS_PATH, 'data/business-alerts.json'),
       rules: abs(process.env.BUSINESS_ALERTS_RULES_PATH, 'data/business-alert-rules.json'),
  };

  function readJson(p, fb) { try { if (!fs.existsSync(p)) return fb; const raw = fs.readFileSync(p, 'utf8'); return
  raw.trim() ? JSON.parse(raw) : fb; } catch (_e) { return fb; } }
  function writeJson(p, data) { const dir = path.dirname(p); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); const tmp = p + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, p); }
  function genId(prefix) { return (prefix || 'id') + '_' + crypto.randomBytes(6).toString('hex'); }

  function readAlerts() { const d = readJson(PATHS.alerts, { alerts: [] }); return Array.isArray(d.alerts) ? d.alerts : [];
  }
  function writeAlerts(items) { writeJson(PATHS.alerts, { alerts: items, updatedAt: new Date().toISOString() }); }
  function readRules() { const d = readJson(PATHS.rules, { rules: [] }); return Array.isArray(d.rules) ? d.rules : []; }
  function writeRules(items) { writeJson(PATHS.rules, { rules: items, updatedAt: new Date().toISOString() }); }

  module.exports = { PATHS, readJson, writeJson, genId, readAlerts, writeAlerts, readRules, writeRules, ROOT };
