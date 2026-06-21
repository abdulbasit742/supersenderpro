// lib/platformControl/errorPatternPreview.js — error pattern counts from logs, masked.
  'use strict';
  const cfg = require('./config');
  const { maskMessage } = require('./redactor');


  function errorPatternPreview() {
    const logFiles = cfg.walk('logs', { exts: ['.log'], maxDepth: 2 }).concat(cfg.walk('data/logs', { exts: ['.log'],
  maxDepth: 2 }));
      const patterns = {};
      logFiles.forEach((f) => {
        const src = cfg.readSafe(f);
        if (!src) return;
      src.split(/\r?\n/).slice(-500).forEach((line) => {
          if (/error|exception|fail/i.test(line)) {
            const key = line.replace(/\d+/g, '#').slice(0, 40);
              patterns[key] = (patterns[key] || 0) + 1;
          }
        });
      });
    const errorPatternsPreview = Object.keys(patterns).slice(0, 20).map((k) => ({ pattern: maskMessage(k), countPreview:
  patterns[k] }));
      return cfg.base({ piiMasked: true, errorPatternsPreview, logFilesScannedPreview: logFiles.length });
  }


  module.exports = { errorPatternPreview };
