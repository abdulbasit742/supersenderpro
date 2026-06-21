// lib/platformControl/logPreview.js — last log lines, redacted. Never returns raw logs.
  'use strict';
  const cfg = require('./config');
  const { redactLog } = require('./redactor');


  function logPreview() {
    const logFiles = cfg.walk('logs', { exts: ['.log'], maxDepth: 2 }).concat(cfg.walk('data/logs', { exts: ['.log'],
  maxDepth: 2 }));
      const logsPreview = [];
      logFiles.forEach((f) => {
        const src = cfg.readSafe(f);
        if (!src) return;
      src.split(/\r?\n/).filter(Boolean).slice(-10).forEach((line) => logsPreview.push(redactLog(line)));
      });
      return cfg.base({ piiMasked: true, rawLogsExposed: false, logsPreview: logsPreview.slice(0, 30) });
  }


  module.exports = { logPreview };
