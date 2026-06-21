// lib/workflowOrchestrator/abandonedCartPreview.js — abandoned cart recovery draft preview.
 'use strict';
 const cfg = require('./config');
 const { maskMessage } = require('./redactor');
 const { consentGuard } = require('./consentGuard');
 function abandonedCartPreview(input) {
   const i = input || {};
     const guard = consentGuard({ marketing: true, consent: i.consent, optedOut: i.optedOut });
     return cfg.base({
       liveSend: false, liveOrderCreation: false,
       cartValuePreview: Number(i.cartValue) || 0,
       recoveryDraftPreview: maskMessage(i.message || 'Aap ka cart abhi pending hai, order complete karein!'),
       consentBlockedPreview: guard.blockedPreview,
     });
 }
 module.exports = { abandonedCartPreview };
