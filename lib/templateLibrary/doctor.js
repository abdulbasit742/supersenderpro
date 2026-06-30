// lib/templateLibrary/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, CATEGORIES } = require('./config');
const store = require('./store');
const variables = require('./variables');
const templateStore = require('./templateStore');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.templates));
 ok('templates_seeded', templateStore.all().length >= 1, 'starter templates available');
 // render + validate sanity
 const rendered = variables.render('Hi {{name|there}}, {{missing}} ok', { name: 'Ali' });
 ok('render_ok', rendered === 'Hi Ali,  ok', 'fallback used + missing renders empty');
 const v = variables.validate('Hi {{name}} {{x|y}}', { context: { name: '' } });
 ok('validate_flags_missing', v.missingInContext.includes('name') && !v.missingInContext.includes('x'), 'missing required var flagged, fallback var not');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, categories: CATEGORIES, maxVersionsPerTemplate: config.maxVersionsPerTemplate },
 counts: { templates: d.templates.length },
 checks,
 };
}

module.exports = { run };
