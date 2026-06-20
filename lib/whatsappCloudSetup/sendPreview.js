// lib/whatsappCloudSetup/sendPreview.js — Dry-run send preview. NEVER calls the WhatsApp API, NEVER sends a real message.
'use strict';

const { maskPhone } = require('./redactor');
const { flags } = require('./safety');
const templateStore = require('../whatsappCloudTemplates/templateStore');
const templatePreview = require('../whatsappCloudTemplates/templatePreview');
const templateValidator = require('../whatsappCloudTemplates/templateValidator');

// input: { templateId, recipient, values }
function sendPreview(input = {}) {
  const warnings = [];
  const blockers = [];

  const template = templateStore.get(input.templateId);
  if (!template) {
    return { ok: false, dryRun: true, liveSend: false, blockers: ['template_not_found'], warnings };
  }

  const validation = templateValidator.validate(template);
  if (!validation.ok) {
    blockers.push('template_invalid');
    validation.errors.forEach((e) => blockers.push(e));
  }
  if (template.status !== 'approved') {
    warnings.push(`template status is "${template.status}" — live sends require an APPROVED template`);
  }

  // Live send is hard-disabled in this layer regardless of env.
  if (flags.liveSend) {
    warnings.push('WHATSAPP_CLOUD_LIVE_SEND is true, but this preview module still performs NO real send.');
  }

  const rendered = templatePreview.render(template, input.values || {});
  if (rendered.missingVariables.length) {
    warnings.push(`missing variables (using placeholders): ${rendered.missingVariables.join(', ')}`);
  }

  return {
    ok: blockers.length === 0,
    dryRun: true,
    liveSend: false,
    template: { id: template.id, name: template.name, language: template.language, category: template.category, status: template.status },
    recipientMasked: maskPhone(input.recipient || ''),
    renderedPreview: rendered.renderedPreview,
    warnings,
    blockers,
  };
}

module.exports = { sendPreview };
