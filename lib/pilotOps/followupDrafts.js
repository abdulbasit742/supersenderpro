'use strict';


/**
    * Pilot Ops — follow-up DRAFT generator. Never sends. Respects consent via the
    * compliance adapter: marketing-type drafts are blocked (with an admin review note)
    * when consent is missing and PILOT_OPS_REQUIRE_CONSENT=true.
    */


const { TEMPLATES } = require('./messageTemplates');
const guard = require('./safetyGuard');
const privacy = require('./privacyGuard');


// Draft types considered marketing (need consent).
const MARKETING_TYPES = ['upgrade_recommendation', 'feedback_request', 'trial_expiring', 'thank_you_success'];


function tryCompliance(pilot) {
  try {
       const adapter = require('./adapters/complianceAdapter');
       if (adapter && typeof adapter.consentStatus === 'function') return adapter.consentStatus(pilot);
     } catch (e) { /* optional */ }
     return { available: false, consentGiven: pilot && pilot.consentGiven === true };
}


function fill(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : '{' + k +
'}'; });
}

function generate(pilot, draftType, opts) {
     const o = opts || {};
     const lang = o.language || guard.defaultLanguage();
     const set = TEMPLATES[draftType];

  if (!set) return { ok: false, error: 'unknown_draft_type', knownTypes: Object.keys(TEMPLATES) };


  // Consent gate for marketing drafts.
  if (MARKETING_TYPES.indexOf(draftType) !== -1 && guard.requireConsent()) {
    const consent = tryCompliance(pilot);
      if (!consent.consentGiven) {
        return {
            ok: false, blocked: true, reason: 'consent_missing',
            adminReviewNote: 'Marketing follow-up blocked: consent missing for this pilot. Get consent before sending.',
            draftType: draftType, dryRun: true,
          };
      }
  }

  const vars = {
      name: (pilot && pilot.ownerNameSafe) || 'there',
      business: (pilot && pilot.businessName) || 'your business',
      plan: o.plan || (pilot && pilot.selectedPlan) || 'Pro',
      percent: o.percent != null ? o.percent : '',
      days: o.days != null ? o.days : '',
  };
  const body = fill(set[lang] || set.english, vars);

  return privacy.redact({
    ok: true, dryRun: true, live: false, draftType: draftType, language: lang,
    body: body, note: 'Draft only. No WhatsApp/email sent.',
  });
}


module.exports = { generate, MARKETING_TYPES };
