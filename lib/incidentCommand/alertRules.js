'use strict';


/**
    * Incident Command — local alert rule model (JSON file). Rules describe WHEN to
    * raise an alert and WHAT draft to produce. Nothing is ever sent live here.
    */

const crypto = require('crypto');
const store = require('./store');
const guard = require('./safetyGuard');


const ALERTS_PATH = process.env.INCIDENT_COMMAND_ALERTS_PATH || 'data/incident-command-alerts.json';

const OUTPUT_TYPES = ['dashboard_alert', 'owner_command_digest_draft', 'whatsapp_admin_draft', 'markdown_report',
'json_report'];

function read() { return store.read(ALERTS_PATH, { rules: [] }); }
function write(db) { return store.write(ALERTS_PATH, db); }
function id() { return 'alert_' + crypto.randomBytes(6).toString('hex'); }

function normalize(input) {
     const i = input || {};
     return {
         id: i.id || id(),
         name: String(i.name || 'Unnamed alert').slice(0, 120),
         moduleId: i.moduleId || null,
         condition: String(i.condition || 'severity>=high').slice(0, 200),
         severity: ['info', 'low', 'medium', 'high', 'critical'].indexOf(i.severity) !== -1 ? i.severity : 'high',
         enabled: i.enabled !== false,
    channels: Array.isArray(i.channels) ? i.channels.filter(function (c) { return OUTPUT_TYPES.indexOf(c) !== -1; }) :
['dashboard_alert'],
         cooldownMinutes: Math.max(0, parseInt(i.cooldownMinutes, 10) || 30),
         dryRun: true, // always dry-run in this layer
         createdAt: i.createdAt || new Date().toISOString(),
     };
}

function list() { return read().rules.slice(); }
function create(input) { const db = read(); const r = normalize(input); db.rules.push(r); write(db); return r; }
function remove(ruleId) { const db = read(); const before = db.rules.length; db.rules = db.rules.filter(function (r) {
return r.id !== ruleId; }); write(db); return before !== db.rules.length; }

// Evaluate a rule's simple condition against an incident-like object. function matches(rule, incident) { if (!rule || !rule.enabled || !incident) return false; if (rule.moduleId && incident.moduleId && rule.moduleId !== incident.moduleId) return false; const order = ['info', 'low', 'medium', 'high', 'critical']; const m = String(rule.condition || '').match(/severity\s*(>=|>|=|<=|<)\s*(info|low|medium|high|critical)/i); if (!m) return order.indexOf(incident.severity) >= order.indexOf(rule.severity); const op = m[1]; const lvl = order.indexOf(m[2].toLowerCase()); const cur = order.indexOf(incident.severity); if (op === '>=') return cur >= lvl; if (op === '>') return cur > lvl; if (op === '=') return cur === lvl; if (op === '<=') return cur <= lvl; return cur < lvl;} 
function statusInfo() { return { path: ALERTS_PATH, writable: store.writable(ALERTS_PATH), rules: read().rules.length,
outputTypes: OUTPUT_TYPES }; }

module.exports = { OUTPUT_TYPES, list, create, remove, normalize, matches, statusInfo };
