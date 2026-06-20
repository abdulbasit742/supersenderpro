// lib/voiceAI/templateRenderer.js — Renders a template with variables, then redacts the result.

const templates = require('./templates');
const { redactText } = require('./redaction');

function render(templateId, vars = {}) {
  const tpl = templates.get(templateId);
  if (!tpl) return { ok: false, error: 'template_not_found' };
  let text = tpl.text;
  const missing = [];
  for (const v of tpl.variables) {
    if (vars[v] === undefined || vars[v] === null || vars[v] === '') missing.push(v);
    text = text.split(`{{${v}}}`).join(vars[v] !== undefined && vars[v] !== null ? String(vars[v]) : `{{${v}}}`);
  }
  return {
    ok: true,
    templateId,
    category: tpl.category,
    language: tpl.language,
    tone: tpl.tone,
    text,
    preview: redactText(text),
    missingVariables: missing,
    safeForAutoSend: tpl.safeForAutoSend,
    approvalRequired: tpl.approvalRequired,
  };
}

module.exports = { render };
