// lib/whatsappCloudTemplates/templateValidator.js — Validates a WhatsApp Cloud template against Meta-style rules.
'use strict';

const { CATEGORIES, STATUSES, extractVariables } = require('./templateModel');

function validate(template = {}) {
  const errors = [];
  const warnings = [];

  if (!template.name || !/^[a-z0-9_]{1,512}$/.test(template.name)) {
    errors.push('name must be lowercase letters, numbers and underscores (1-512 chars)');
  }
  if (!template.language) errors.push('language is required (e.g. en_US)');
  if (!CATEGORIES.includes(template.category)) errors.push(`category must be one of ${CATEGORIES.join(', ')}`);
  if (template.status && !STATUSES.includes(template.status)) errors.push('status is not a recognised value');
  if (!template.body || template.body.trim().length === 0) errors.push('body is required');
  if (template.body && template.body.length > 1024) errors.push('body exceeds 1024 characters');
  if (template.footer && template.footer.length > 60) errors.push('footer exceeds 60 characters');

  // Variable / sample-value coherence.
  const vars = template.variables && template.variables.length ? template.variables : extractVariables(template.body || '');
  const missingSamples = vars.filter((v) => !(template.sampleValues && template.sampleValues[v]));
  if (missingSamples.length) {
    warnings.push(`missing sample values for: ${missingSamples.join(', ')}`);
  }

  // Authentication category should not carry marketing-style promos.
  if (template.category === 'authentication' && /(sale|discount|offer|buy now)/i.test(template.body || '')) {
    warnings.push('authentication templates must not contain promotional content');
  }
  if (template.category === 'marketing') {
    warnings.push('marketing templates have stricter approval + opt-in requirements');
  }

  return { ok: errors.length === 0, errors, warnings, variables: vars, missingSamples };
}

module.exports = { validate };
