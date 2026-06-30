// lib/templateLibrary/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const variables = require('./variables');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.templates));
 const parsed = variables.parse('Hi {{name}}, your code is {{code|N/A}}');
 ok('var_parser_ok', parsed.length === 2 && parsed.find((v) => v.name === 'name').required === true && parsed.find((v) => v.name === 'code').required === false, 'parses required + default vars');
 const r = variables.render('Hi {{name}}', {});
 ok('missing_var_visible', r.missing.includes('name') && r.text.includes('{{name}}'), 'missing required var is reported + left visible');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, requireApprovedToRender: config.requireApprovedToRender, maxRenderChars: config.maxRenderChars },
 counts: { templates: d.templates.length, approved: d.templates.filter((t) => t.status === 'approved').length },
 checks,
 };
}

module.exports = { run };
