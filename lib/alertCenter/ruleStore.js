// lib/alertCenter/ruleStore.js — CRUD for alert rules. A rule = { event, condition?, severity,
// channels:['inapp','owner'], throttleMinutes?, template?, active }. Seeds a few sensible defaults
// on first use so the system is useful out of the box.

const store = require('./store');
const { config, SEVERITIES } = require('./config');

const DEFAULTS = [
 { id: 'sla-breach', name: 'Support SLA breach', event: 'sla.breach', severity: 'critical', channels: ['inapp', 'owner'], template: 'SLA breached on ticket {{ticket}} ({{priority}}).' },
 { id: 'payment-success', name: 'Payment received', event: 'payment.succeeded', severity: 'info', channels: ['inapp'], template: 'Payment received: {{currency}} {{amount}} ({{plan}}).' },
 { id: 'send-failed', name: 'Send failure', event: 'send.failed', severity: 'warning', channels: ['inapp', 'owner'], template: 'A message send failed for {{target}}: {{reason}}.' },
 { id: 'usage-exceeded', name: 'Usage over limit', event: 'usage.exceeded', severity: 'warning', channels: ['inapp', 'owner'], template: 'Tenant {{tenantId}} exceeded {{metric}} ({{used}}/{{limit}}).' },
];

function _seed() { const d = store.load(); if (!d.rules.length) { d.rules = DEFAULTS.map((r) => ({ ...r, active: true, createdAt: store.nowIso(), updatedAt: store.nowIso() })); store.save(d); } return d.rules; }

function all() { return _seed(); }
function get(id) { return all().find((r) => r.id === id) || null; }
function forEvent(event) { return all().filter((r) => r.active !== false && r.event === event); }

function upsert(input = {}) {
 if (!input.event) throw new Error('event is required');
 if (input.severity && !SEVERITIES.includes(input.severity)) throw new Error('invalid severity');
 _seed();
 const d = store.load();
 const now = store.nowIso();
 const rec = {
 id: input.id || store.genId('rule'),
 name: input.name || input.event,
 event: String(input.event),
 condition: input.condition || null,
 severity: input.severity || 'info',
 channels: Array.isArray(input.channels) && input.channels.length ? input.channels : ['inapp'],
 throttleMinutes: Number(input.throttleMinutes) >= 0 ? Number(input.throttleMinutes) : config.defaultThrottleMinutes,
 template: input.template || '{{event}}',
 active: input.active === undefined ? true : !!input.active,
 };
 const idx = d.rules.findIndex((r) => r.id === rec.id);
 if (idx >= 0) { rec.createdAt = d.rules[idx].createdAt; rec.updatedAt = now; d.rules[idx] = rec; }
 else { rec.createdAt = now; rec.updatedAt = now; d.rules.push(rec); }
 store.save(d);
 return rec;
}
function setActive(id, active) { const d = store.load(); const r = d.rules.find((x) => x.id === id); if (!r) throw new Error('rule not found'); r.active = !!active; r.updatedAt = store.nowIso(); store.save(d); return r; }
function remove(id) { const d = store.load(); d.rules = d.rules.filter((r) => r.id !== id); store.save(d); return true; }

module.exports = { all, get, forEvent, upsert, setActive, remove, DEFAULTS };
