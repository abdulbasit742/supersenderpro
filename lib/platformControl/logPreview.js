// lib/platformControl/logPreview.js — read-only, redacted log preview. Never returns raw logs.
'use strict';
const cfg = require('./config');
const { redactLog, safeText } = require('./redactor');

function getLogPreview() {
  // Demo, redaction-safe sample records (no real log files are read or exposed).
  const sample = [
    { ts: new Date().toISOString(), level: 'info', message: 'platform-control status preview generated' },
    { ts: new Date().toISOString(), level: 'info', message: 'readiness scan completed (dry-run)' },
    { ts: new Date().toISOString(), level: 'warn', message: 'optional integration not configured (preview)' },
  ];
  const logFilesDetectedPreview = ['data', 'artifacts'].filter((d) => cfg.exists(d)).map(safeText);
  return cfg.safetyFlags({
    piiMasked: true,
    rawLogsExposed: false,
    logsPreview: sample.map(redactLog),
    logFilesDetectedPreview,
    warnings: [], blockers: [],
  });
}
module.exports = { getLogPreview };
