// lib/platformControl/publicPageSafetyScanner.js — read-only public asset safety scan (secret-like strings, missing assets).
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getPublicPageSafety() {
  const pages = cfg.listFiles('public', '.html');
  const secretPat = /(sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})/;
  const unsafePagesPreview = [];
  const missingAssetsPreview = [];
  pages.slice(0, 80).forEach((page) => {
    const html = cfg.readText('public/' + page);
    if (secretPat.test(html)) unsafePagesPreview.push(safeText(page));
    const re = /(?:src|href)=["'](\/(?:js|css|assets)\/[^"'?#]+)["']/g;
    let m;
    while ((m = re.exec(html))) { if (!cfg.exists('public' + m[1])) missingAssetsPreview.push({ page: safeText(page), asset: safeText(m[1]) }); }
  });
  return cfg.safetyFlags({
    pagesScannedPreview: Math.min(pages.length, 80),
    unsafePagesPreview,
    missingAssetsPreview: missingAssetsPreview.slice(0, 50),
    totalUnsafePreview: unsafePagesPreview.length,
    totalMissingAssetsPreview: missingAssetsPreview.length,
    warnings: (unsafePagesPreview.length || missingAssetsPreview.length) ? ['public_page_safety_signals_preview'] : [],
    blockers: [],
  });
}
module.exports = { getPublicPageSafety };
