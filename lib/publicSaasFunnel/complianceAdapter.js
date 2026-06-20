// lib/publicSaasFunnel/complianceAdapter.js
// Uses the existing Compliance Center consent/policy guard if present; else local fallback.

const { config } = require('./store');

let cc = null;
try { cc = require('../complianceCenter'); } catch { cc = null; }

const present = !!cc;

// Check whether we may contact / market to a lead based on consent + suppression.
function checkConsent(lead) {
  const consentContact = !!(lead && lead.consentContact);
  const consentMarketing = !!(lead && lead.consentMarketing);

  // Local baseline: consent required when configured.
  const base = {
    source: present ? 'complianceCenter' : 'local_fallback',
    consentContact,
    consentMarketing,
    canContact: consentContact || !config.requireConsent,
    canMarket: consentMarketing,
    suppressed: false,
    reasons: [],
  };

  if (!base.canContact) base.reasons.push('no_contact_consent');
  if (!base.canMarket) base.reasons.push('no_marketing_consent');

  // If Compliance Center is present, layer its policy check (defensive, never throws).
  if (present && cc.policyChecker && typeof cc.policyChecker.canContact === 'function') {
    try {
      const subject = lead && (lead.phoneMasked || lead.emailMasked || lead.id);
      const verdict = cc.policyChecker.canContact(subject, 'whatsapp');
      if (verdict && verdict.allowed === false) {
        base.canContact = false;
        base.canMarket = false;
        base.suppressed = true;
        if (verdict.reason) base.reasons.push(`compliance:${verdict.reason}`);
      }
    } catch { /* keep local baseline */ }
  }

  return base;
}

function checks() {
  return {
    complianceCenterPresent: present,
    contactConsentEnforced: config.requireConsent,
    marketingConsentEnforced: true,
    dataProcessingConsent: config.requireConsent,
    suppressionList: present,
    privacyMasking: true,
    externalAiDisabledByDefault: true,
    noColdOutreach: true,
    noBulkUnsolicited: true,
  };
}

module.exports = { present, checkConsent, checks };
