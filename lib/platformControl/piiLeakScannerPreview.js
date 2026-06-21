// lib/platformControl/piiLeakScannerPreview.js — hardcoded phone/email preview, always masked.
 'use strict';
 const cfg = require('./config');
 const { maskPhone, maskEmail, maskPath } = require('./redactor');


 const PHONE_RE = /\+?92\d{9,10}|03\d{9}/g;
 const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;


 function piiLeakScannerPreview() {
   const files = cfg.walk('public', { exts: ['.html', '.js'] }).concat(cfg.walk('data', { exts: ['.json'], maxDepth: 2
 }));
   const piiFindingsPreview = [];
     files.forEach((f) => {
       const src = cfg.readSafe(f) || '';
       const phones = src.match(PHONE_RE) || [];
       const emails = (src.match(EMAIL_RE) || []).filter((e) => !/example\.com|sentry|cdn|schema\.org/i.test(e));
       if (phones.length || emails.length) {

            piiFindingsPreview.push({
              file: maskPath(f),
              phonesPreview: phones.slice(0, 3).map(maskPhone),
              emailsPreview: emails.slice(0, 3).map(maskEmail),
            });
        }
      });
    return cfg.base({ piiMasked: true, piiFindingsPreview: piiFindingsPreview.slice(0, 50), filesScannedPreview:
  files.length });
  }


  module.exports = { piiLeakScannerPreview };
