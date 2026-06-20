// lib/whatsappCloudTemplates/templatePreview.js — Renders a template body with sample/provided variables. No sending.
'use strict';

const { extractVariables } = require('./templateModel');

// Render {{var}} placeholders using provided values (falls back to template.sampleValues, then a [var] marker).
function render(template = {}, values = {}) {
  const body = String(template.body || '');
  const vars = template.variables && template.variables.length ? template.variables : extractVariables(body);
  const merged = Object.assign({}, template.sampleValues || {}, values || {});
  const missing = [];

  const rendered = body.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key) => {
    if (merged[key] !== undefined && merged[key] !== '') return String(merged[key]);
    missing.push(key);
    return `[${key}]`;
  });

  return {
    ok: true,
    dryRun: true,
    variables: vars,
    usedValues: merged,
    missingVariables: [...new Set(missing)],
    headerType: template.headerType || 'none',
    footer: template.footer || '',
    buttons: template.buttons || [],
    renderedPreview: rendered,
  };
}

module.exports = { render };
