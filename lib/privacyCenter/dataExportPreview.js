'use strict';


/**
    * Privacy Center — data export PREVIEW. Builds a redacted bundle preview for a
    * privacy request. Never exports raw private data. No external calls.
    */

const service = require('./privacyRequestService');
const redactor = require('./redactor');

// Read-only adapter probe for Customer 360 / CRM (degrades safely).
function tryCustomer360() {
  try { const m = require(process.cwd() + '/lib/customer360'); if (m && typeof m.previewForExport === 'function') return
m; } catch (e) {}
  return null;
}


function run(requestId) {
  const req = service.get(requestId);
  if (!req) return { ok: false, dryRun: true, liveExport: false, requestId: requestId, requesterMasked: null,
redactedBundlePreview: {}, warnings: [], blockers: ['request not found'] };


     const warnings = ['Preview only. No raw private data exported.'];
     const blockers = [];
     if (req.status === 'waiting_verification') warnings.push('Requester identity not yet verified.');


     const c360 = tryCustomer360();
     let bundle;
     if (c360) {
         try { bundle = redactor.redact(c360.previewForExport({ tenantId: req.tenantId })); }
         catch (e) { bundle = null; warnings.push('Customer 360 export preview failed safely.'); }
     }
     if (!bundle) {
         // Redacted demo bundle (no real data).
         bundle = redactor.redact({
          profile: { name: req.requesterNameSafe, phone: req.phoneMasked, email: req.emailMasked, tenantId: req.tenantId },
          conversations: { count: 0, note: 'redacted preview; raw messages excluded' },
          orders: { count: 0, note: 'redacted preview' },
          consents: { count: 0, note: 'see consent records' },
           note: 'Demo redacted bundle. Connect Customer 360 for real (still redacted) preview.',
         });
     }


  return { ok: true, dryRun: true, liveExport: false, requestId: requestId, requesterMasked: req.emailMasked ||
req.phoneMasked || req.requesterNameSafe, redactedBundlePreview: bundle, warnings: warnings, blockers: blockers };

}

module.exports = { run };
