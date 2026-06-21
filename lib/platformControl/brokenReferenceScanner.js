// lib/platformControl/brokenReferenceScanner.js — unresolved local require() targets (static).
  'use strict';
  const cfg = require('./config');
  const { maskPath } = require('./redactor');
  const path = require('path');


  function brokenReferenceScanner() {
    const files = cfg.walk('', { exts: ['.js'], maxDepth: 4, skip: ['node_modules', '.git', 'coverage', 'dist'] });
      const RE = /require\(\s*['"`](\.\.?\/[^'"`]+)['"`]\s*\)/g;
      const brokenReferencesPreview = [];
      files.forEach((f) => {

        const src = cfg.readSafe(f) || '';
        let m; RE.lastIndex = 0;
        while ((m = RE.exec(src))) {
            const target = m[1];
            const dir = path.posix.dirname(f);
            const resolved = path.posix.normalize(path.posix.join(dir, target));
            const candidates = [resolved, resolved + '.js', resolved + '.json', resolved + '/index.js'];
        if (!candidates.some((c) => cfg.exists(c))) brokenReferencesPreview.push({ file: maskPath(f), missing:
  maskPath(target) });
        }
      });
      return cfg.base({ brokenReferencesPreview: brokenReferencesPreview.slice(0, 100) });
  }


  module.exports = { brokenReferenceScanner };
