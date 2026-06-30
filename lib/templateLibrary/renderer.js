// lib/templateLibrary/renderer.js — Render a stored template by id with provided values. Enforces
// the approval gate (when configured), validates variables (no silent blanks for required ones),
// guards max length, and records usage. Returns the text to send + a validation report.

const { config } = require('./config');
const templateStore = require('./templateStore');
const variables = require('./variables');

function render(id, values = {}, { recordUsage = true, strict } = {}) {
 const t = templateStore.raw(id);
 if (!t) throw new Error('template not found');
 if (config.requireApprovedToRender && t.status !== 'approved') {
 return { ok: false, reason: 'template not approved', status: t.status };
 }
 const r = variables.render(t.body, values, { maxChars: config.maxRenderChars });
 const enforceStrict = strict === undefined ? config.requireApprovedToRender : strict;
 if (enforceStrict && r.missing.length) {
 return { ok: false, reason: 'missing required variables', missing: r.missing };
 }
 if (recordUsage) templateStore.recordUsage(id);
 return { ok: true, text: r.text, missing: r.missing, used: r.used, truncatedFrom: r.truncatedFrom || null, status: t.status, version: t.version };
}

// Preview without recording usage or enforcing the approval gate (for the editor UI).
function preview(id, values = {}) {
 const t = templateStore.raw(id);
 if (!t) throw new Error('template not found');
 const r = variables.render(t.body, values, { maxChars: config.maxRenderChars });
 return { ok: true, text: r.text, missing: r.missing, used: r.used, variables: t.variables, status: t.status };
}

module.exports = { render, preview };
