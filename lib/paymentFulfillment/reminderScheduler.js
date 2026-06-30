// lib/paymentFulfillment/reminderScheduler.js — Schedule + dispatch renewal (pre-due) and
// dunning (post-due) payment reminders off a license's renewal date. Dispatch is draft-only
// unless live notifications are enabled. Re-scheduling replaces a tenant's prior scheduled set.

const store = require('./store');
const { config } = require('./config');
const notify = require('./notify');

const DAY = 24 * 60 * 60 * 1000;

function fmtMoney(a, c) {
 if (a === null || a === undefined) return '';
 return `${c || ''} ${Number(a).toLocaleString()}`.trim();
}

function buildMessage(rem, plan) {
 if (rem.kind === 'dunning') {
 return `Reminder: your SuperSender Pro subscription ${plan ? '(' + plan.name + ') ' : ''}payment is overdue. Please renew to avoid interruption. Due: ${rem.renewalDueAt}.`;
 }
 return `Heads up: your SuperSender Pro subscription ${plan ? '(' + plan.name + ') ' : ''}renews on ${rem.renewalDueAt}${plan ? ' — ' + fmtMoney(plan.price, plan.currency) : ''}. Renew anytime to stay active.`;
}

function schedule(license, { tenantId, planId, plan } = {}) {
 const due = license && (license.renewalDueAt || license.expiresAt);
 const d = store.load();
 // Clear prior scheduled reminders for this tenant; we re-schedule on each fulfillment.
 d.reminders = d.reminders.filter((r) => !(String(r.tenantId) === String(tenantId) && r.status === 'scheduled'));
 let created = [];
 if (due) {
 const dueMs = Date.parse(due);
 created = config.reminderOffsetsDays.map((offset) => ({
 id: store.genId('rem'),
 tenantId,
 planId: planId || (license && license.planId) || null,
 kind: offset >= 0 ? 'pre_renewal' : 'dunning',
 offsetDays: offset,
 fireAt: new Date(dueMs - offset * DAY).toISOString(),
 renewalDueAt: due,
 status: 'scheduled',
 createdAt: store.nowIso(),
 }));
 d.reminders.push(...created);
 }
 store.save(d);
 return created;
}

function scheduledFor(tenantId) { return store.load().reminders.filter((r) => String(r.tenantId) === String(tenantId)); }
function due(refNow = Date.now()) { return store.load().reminders.filter((r) => r.status === 'scheduled' && Date.parse(r.fireAt) <= refNow); }

async function run(refNow = Date.now(), planLookup = null) {
 const list = due(refNow);
 const results = [];
 for (const rem of list) {
 const plan = planLookup ? planLookup(rem.planId) : null;
 const msg = buildMessage(rem, plan);
 const res = await notify.dispatch(null, msg, { kind: 'reminder', reminderKind: rem.kind });
 const d = store.load();
 const r = d.reminders.find((x) => x.id === rem.id);
 if (r) { r.status = res.sent ? 'sent' : 'drafted'; r.processedAt = store.nowIso(); r.preview = res.preview || msg; store.save(d); }
 results.push({ id: rem.id, kind: rem.kind, sent: res.sent, preview: res.preview || msg });
 }
 return { processed: results.length, sent: results.filter((r) => r.sent).length, drafted: results.filter((r) => !r.sent).length, results };
}

module.exports = { schedule, scheduledFor, due, run, buildMessage };
