'use strict';
const fs = require('fs');
const path = require('path');
function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (_) { return false; } }
function envMissing(name) { return process.env[name] == null || String(process.env[name]).trim() === ''; }
const RULES = [
  { id: 'env_incident_missing', category: 'env_config', severity: 'low', runbookId: 'env_placeholder_missing', test: () => envMissing('INCIDENT_COMMAND_STORE_PATH'), summary: 'INCIDENT_COMMAND_STORE_PATH not set (using default)', recommendedFix: 'Add the placeholder to .env.example if needed.' },
  { id: 'dashboard_missing', category: 'dashboard', severity: 'medium', runbookId: 'dashboard_missing', test: () => !exists('public/incident-command.html'), summary: 'Incident dashboard file missing', recommendedFix: 'Copy public/incident-command.html and mount the nav hook.' },
  { id: 'route_missing', category: 'routes', severity: 'medium', runbookId: 'route_missing', test: () => !exists('routes/incidentCommandRoutes.js'), summary: 'Incident route file missing', recommendedFix: 'Copy routes/incidentCommandRoutes.js and mount it in server.js.' }
];
function evaluate() { return RULES.filter((r) => { try { return r.test(); } catch (_) { return false; } }); }
module.exports = { RULES, evaluate, exists, envMissing };
