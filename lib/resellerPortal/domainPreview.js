'use strict';
/** Custom-domain CHECKLIST preview only. No DNS config, no SSL issuance. */
const safety = require('./safetyGuard');
function preview(customDomain) {
  const gate = safety.check('custom_domain');
  const domain = String(customDomain || '').trim().toLowerCase();
  const valid = /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain);
  return {
    customDomain: domain || null,
    domainStatus: gate.blocked ? 'disabled' : (valid ? 'checklist_ready' : 'invalid_format'),
    valid,
    checklist: [
       'Add a CNAME record pointing to the app host (manual)',
       'Verify domain ownership (manual)',
       'Issue SSL via your host/CDN (manual)',
    ],
    blockedReasons: gate.blockedReasons,
    note: 'Preview + manual checklist only. No DNS configured, no SSL issued.',
    dryRun: true,
  };

}
module.exports = { preview };
