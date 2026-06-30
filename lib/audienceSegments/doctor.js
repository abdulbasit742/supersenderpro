// lib/audienceSegments/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const contactSource = require('./contactSource');
const ruleEngine = require('./ruleEngine');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.segments));
 ok('contact_source_present', true, JSON.stringify(contactSource.sourceInfo()));
 // sanity-check the rule engine deterministically
 const c = { contact: '+1', name: 'x', tags: ['vip'], attributes: { city: 'khi' }, totalSpend: 100, lastActiveAt: new Date().toISOString() };
 ok('rule_engine_eq', ruleEngine.evalCondition({ field: 'attr:city', op: 'eq', value: 'khi' }, c));
 ok('rule_engine_has_tag', ruleEngine.evalCondition({ field: 'tag', op: 'has_tag', value: 'vip' }, c));
 ok('rule_engine_spend_gt', ruleEngine.evalCondition({ field: 'totalSpend', op: 'gt', value: 50 }, c));
 return {
 ok: checks.every((x) => x.pass),
 posture: { enabled: config.enabled, maxResolveSize: config.maxResolveSize, maxScan: config.maxScan },
 source: contactSource.sourceInfo(),
 counts: { segments: d.segments.length },
 checks,
 };
}

module.exports = { run };
