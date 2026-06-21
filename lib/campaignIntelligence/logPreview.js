// lib/campaignIntelligence/logPreview.js — redacted log tail (optional). Never raw recipient lists.
  'use strict';
  const cfg = require('./config');
  const { redactLog } = require('./redactor');


  function logPreview() {
    const files = cfg.walk('logs', { exts: ['.log'], maxDepth: 2 }).concat(cfg.walk('data/logs', { exts: ['.log'],
  maxDepth: 2 }));
    const logsPreview = [];
    files.forEach((f) => { const src = cfg.readSafe(f); if (!src) return; src.split(/\r?\n/).filter(Boolean).slice(-10).forEach((l) => logsPreview.push(redactLog(l))); });
    return cfg.base({ rawLogsExposed: false, recipientListExposed: false, logsPreview: logsPreview.slice(0, 30) });
  }
  module.exports = { logPreview };
