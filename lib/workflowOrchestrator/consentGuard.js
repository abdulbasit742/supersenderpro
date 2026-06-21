// lib/workflowOrchestrator/consentGuard.js — preview-only consent check.
 'use strict';
 const cfg = require('./config');
 function consentGuard(input) {
   const i = input || {};
      const isMarketing = !!i.marketing;
      const hasConsent = i.consent === true;
      const optedOut = i.optedOut === true;

     const blockedPreview = (isMarketing && !hasConsent) || optedOut;
     return cfg.base({
       consentGuardPreview: hasConsent, optOutGuardPreview: !optedOut,
     blockedPreview, reasonPreview: optedOut ? 'customer_opted_out_preview' : (blockedPreview ?
 'marketing_consent_missing_preview' : 'allowed_preview'),
     });
 }
 module.exports = { consentGuard };
