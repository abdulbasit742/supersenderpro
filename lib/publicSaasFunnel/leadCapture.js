'use strict';
/** Lead/demo/trial handlers. Consent required; dry-run; no live email, tenant, or payment. */
const store = require('./store');
const safety = require('./safety');
function capture(input, intent) {
     const i = input || {};
     if (safety.requireConsent() && i.consent !== true) return { ok: false, errors: ['consent_required'] };
     const lead = store.addLead(Object.assign({}, i, { intent: intent || 'contact' }));
     return {
       ok: true, dryRun: true, leadId: lead.id, intent: lead.intent,
       tenantCreated: false, emailSent: false, paymentCaptured: false,
    note: intent === 'trial' ? 'Trial request logged (dry-run). No tenant created, no charge.' : intent === 'demo' ?
'Demo request logged. Open /demo-sandbox.html to self-serve.' : 'Lead logged. No live email sent.',
     };
}
module.exports = {
  contact: (i) => capture(i, 'contact'),
     demo: (i) => capture(i, 'demo'),
     trial: (i) => capture(i, 'trial'),
     list: () => store.listLeads(),
};
