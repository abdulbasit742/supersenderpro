 'use strict';

 /**
     * Incident Command - incident log + runbook (Phase 1, local store only).
     * Logs incidents to a JSON file, returns runbook steps + backup/alert reminders.
     * Alerts are DRAFTS only; nothing is sent. App runs if the file is missing.
     */

 const fs = require('fs');
 const path = require('path');
 const crypto = require('crypto');


 function storePath() {
      const p = process.env.INCIDENT_COMMAND_STORE_PATH || 'data/incident-command.json';
      return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
 }
 function emptyState() { return { version: 1, incidents: [], updatedAt: null }; }
 function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
 function read() {
   try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!Array.isArray(s.incidents)) s.incidents = [];
 return s; }
      catch (_e) { return emptyState(); }
 }
 function write(s) {
   try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s,
 null, 2), 'utf8'); return true; }
   catch (_e) { return false; }
 }

 const SEVERITIES = ['low', 'medium', 'high', 'critical'];

 // Generic runbook steps by severity. Pure data.
 function runbookFor(severity) {
      const base = [
        'Acknowledge the incident and assign an owner.',
          'Check recent deploys / config changes.',
          'Verify backups exist (run the Backup/Restore snapshot).',
          'Capture logs + a short timeline.'
      ];
      if (severity === 'high' || severity === 'critical') {
        base.push('Pause risky automations (set DRY_RUN=true where applicable).');
          base.push('Draft an admin alert (review before sending).');
      }
      base.push('Resolve, then write a one-paragraph post-mortem.');
      return base;
 }


function openIncident(input) {
   input = input || {};
   const sev = SEVERITIES.indexOf(input.severity) !== -1 ? input.severity : 'medium';
   const s = read();
   const rec = {
    id: 'inc_' + crypto.randomBytes(5).toString('hex'),
    at: new Date().toISOString(),
    title: String(input.title || 'Untitled incident').slice(0, 120),
    severity: sev,
    status: 'open',
    runbook: runbookFor(sev),
    reminders: {
      backup: 'Run a Backup/Restore snapshot before making changes.',
      alert: 'Admin alert is a DRAFT only; nothing is sent automatically.'
    },
    notes: input.notes ? String(input.notes).slice(0, 500) : null,
    resolvedAt: null
   };
   s.incidents.unshift(rec);
   write(s);
   return rec;
}


function resolveIncident(id, note) {
 const s = read();
   const inc = s.incidents.find(function (i) { return i.id === id; });
   if (!inc) return { ok: false, error: 'not_found' };
   inc.status = 'resolved';
   inc.resolvedAt = new Date().toISOString();
   if (note) inc.resolution = String(note).slice(0, 500);
   write(s);
   return { ok: true, incident: inc };
}


function list(limit) {
   const s = read();
   return typeof limit === 'number' ? s.incidents.slice(0, limit) : s.incidents;
}
function status() {
   const s = read();
   const open = s.incidents.filter(function (i) { return i.status === 'open'; }).length;
 return { storePath: process.env.INCIDENT_COMMAND_STORE_PATH || 'data/incident-command.json', total: s.incidents.length,
open: open, updatedAt: s.updatedAt };
}

module.exports = { openIncident, resolveIncident, list, status, runbookFor, SEVERITIES };
