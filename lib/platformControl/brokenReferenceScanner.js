// lib/platformControl/brokenReferenceScanner.js — read-only broken asset/reference detector.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getBrokenReferences() {
  const pages = cfg.listFiles('public', '.html');
  const brokenReferencesPreview = [];
  pages.slice(0, 60).forEach((page) => {
    const html = cfg.readText('public/' + page);
    const re = /(?:src|href)=["'](\/(?:js|css|assets)\/[^"'?#]+)["']/g;
    let m;
    while ((m = re.exec(html))) {
      const ref = m[1];
      if (!cfg.exists('public' + ref)) {
        brokenReferencesPreview.push({ page: safeText(page), ref: safeText(ref) });
      }
    }
  });
  return cfg.safetyFlags({
    pagesScannedPreview: Math.min(pages.length, 60),
    brokenReferencesPreview: brokenReferencesPreview.slice(0, 50),
    totalBrokenPreview: brokenReferencesPreview.length,
    warnings: brokenReferencesPreview.length ? ['broken_references_detected_preview'] : [],
    blockers: [],
  });
}
module.exports = { getBrokenReferences };
