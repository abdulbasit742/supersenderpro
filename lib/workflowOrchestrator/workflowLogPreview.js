// lib/workflowOrchestrator/workflowLogPreview.js — redacted log tail from logs/ (optional).
 'use strict';
 const cfg = require('./config');
 const { redactLog } = require('./redactor');
 function workflowLogPreview() {
   const files = cfg.walk('logs', { exts: ['.log'], maxDepth: 2 }).concat(cfg.walk('data/logs', { exts: ['.log'],
 maxDepth: 2 }));
   const logsPreview = [];
   files.forEach((f) => { const src = cfg.readSafe(f); if (!src) return; src.split(/\r?\n/).filter(Boolean).slice(-10).forEach((l) => logsPreview.push(redactLog(l))); });
     return cfg.base({ rawLogsExposed: false, logsPreview: logsPreview.slice(0, 30) });
 }
 module.exports = { workflowLogPreview };
