// lib/platformControl/piiLeakScannerPreview.js — read-only PII/secret leak risk preview for public assets.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getPiiLeakPreview() {
  const pages = cfg.listFiles('public', '.html').concat(cfg.listFiles('public/js', '.js').map((f) => 'js/' + f));
  const findingsPreview = [];
  const secretPat = /(sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16})/;
  const phonePat = /\b\+?\d{11,15}\b/;
  pages.slice(0, 80).forEach((rel) => {
    const txt = cfg.readText('public/' + rel);
    if (secretPat.test(txt)) findingsPreview.push({ file: safeText(rel), type: 'possible_secret_pattern' });
    if (phonePat.test(txt)) findingsPreview.push({ file: safeText(rel), type: 'possible_raw_phone' });
  });
  return cfg.safetyFlags({
    piiMasked: true,
    findingsPreview: findingsPreview.slice(0, 50),
    totalFindingsPreview: findingsPreview.length,
    warnings: findingsPreview.length ? ['review_public_assets_preview'] : [],
    blockers: [],
  });
}
module.exports = { getPiiLeakPreview };
