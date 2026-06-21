 'use strict';
 /**
     * journeyPreviewRunner.js — walks a journey's steps and produces drafts + * segment preview, fully dry-run. Generates email/SMS drafts via the template * libs and runs each through the consent guard. NEVER sends. */ const emailTemplates = require('./emailTemplates'); const smsTemplates = require('./smsTemplates'); const segmentPreview = require('./segmentPreview'); const consentGuard = require('./consentGuard'); function emailDraft(templateId, recipient) { const r = emailTemplates.render(templateId, {}); const consent = consentGuard.check('email', recipient);
      return {

    ok: true, dryRun: true, liveSend: false, channel: 'email',
    recipientMasked: recipient ? recipient.recipientEmailMasked : segmentPreview.maskEmail('customer@example.com'),
    subjectPreview: r.subjectPreview, bodyPreview: r.bodyPreview,
    consentOk: consent.consentOk, unsubscribeIncluded: r.unsubscribeIncluded,
    warnings: consent.warnings, blockers: [],
  };
}


function smsDraft(templateId, recipient) {
  const r = smsTemplates.render(templateId, {});
  const consent = consentGuard.check('sms', recipient);
  return {
    ok: true, dryRun: true, liveSend: false, channel: 'sms',
    recipientMasked: recipient ? recipient.recipientPhoneMasked : segmentPreview.maskPhone('+923000000011'),
    messagePreview: r.messagePreview,
    consentOk: consent.consentOk, optOutIncluded: r.optOutIncluded,
    warnings: consent.warnings, blockers: [],
  };
}

function run(journey) {
  if (!journey) return { ok: false, blockers: ['journey_not_found'] };
  const seg = segmentPreview.preview(journey.audienceSegment, 5);
  const sampleRecipient = seg.sample[0] || null;
  const emailDrafts = [];
  const smsDrafts = [];
  const warnings = [];
  const stepsOut = (journey.steps || []).map((s) => {
    const out = { id: s.id, type: s.type, status: 'preview' };
  if (s.type === 'send_email_draft') { const d = emailDraft(s.templateId, sampleRecipient); emailDrafts.push(d);
out.consentOk = d.consentOk; }
  else if (s.type === 'send_sms_draft') { const d = smsDraft(s.templateId, sampleRecipient); smsDrafts.push(d);
out.consentOk = d.consentOk; }
    else if (s.type === 'whatsapp_draft') { out.note = 'WhatsApp draft preview only; no live send.'; }
    else if (s.type === 'wait') { out.duration = s.duration; }
    else if (s.type.indexOf('condition_') === 0) { out.condition = s; }
    return out;
  });
  if (journey.consentRequired) warnings.push('Consent required; non-consenting recipients are suppressed on live send.');
  return {
    ok: true, dryRun: true, liveActionsEnabled: false,
    journeyId: journey.id,
    segmentPreview: seg,
    steps: stepsOut,
    emailDrafts, smsDrafts,
    warnings, blockers: [],
  };
}


module.exports = { run, emailDraft, smsDraft };
