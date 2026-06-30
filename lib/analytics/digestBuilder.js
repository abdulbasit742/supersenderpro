// lib/analytics/digestBuilder.js — Build + (optionally) deliver a scheduled digest report
// (daily/weekly) from the KPI snapshot + recent rollups. Delivery is draft-only until live
// digests + a notifier are enabled. Each built digest is recorded for history.

const store = require('./store');
const kpi = require('./kpiSnapshot');
const eventTracker = require('./eventTracker');
const rollups = require('./rollups');
const notify = require('./notify');

function _line(label, val) { return `${label}: ${val}`; }

function build({ period = 'daily' } = {}) {
 const snap = kpi.snapshot();
 const sinceMs = Date.now() - (period === 'weekly' ? 7 : 1) * 864e5;
 const recent = eventTracker.all().filter((e) => Date.parse(e.at) >= sinceMs);
 const topEvents = rollups.breakdown(recent, { dimension: '__none__' }); // count by (none) => total only
 const lines = [
 `SuperSender ${period} report — ${new Date().toISOString().slice(0, 10)}`,
 _line('Events tracked', recent.length),
 ];
 if (snap.billing) lines.push(_line('Active tenants', snap.billing.activeTenants), _line('Invoices due', snap.billing.invoicesDue), _line('Revenue (draft)', snap.billing.monthlyRevenueDraft));
 if (snap.support) lines.push(_line('Open tickets', snap.support.open), _line('SLA breaches', snap.support.slaBreaches));
 if (snap.drip) lines.push(_line('Active journeys', snap.drip.activeJourneys), _line('Active enrollments', snap.drip.activeEnrollments));
 const text = lines.join('\n');

 const digest = { id: store.genId('dig'), period, text, snapshot: snap, eventsInPeriod: recent.length, createdAt: store.nowIso(), delivered: false };
 const d = store.load(); d.digests.push(digest); store.save(d);
 return digest;
}

async function deliver(digest, { to } = {}) {
 const res = await notify.dispatch(to || null, digest.text, { kind: 'analytics_digest', period: digest.period });
 if (res.sent) { const d = store.load(); const x = d.digests.find((g) => g.id === digest.id); if (x) { x.delivered = true; x.deliveredAt = store.nowIso(); store.save(d); } }
 return res;
}

async function run({ period = 'daily', to } = {}) {
 const digest = build({ period });
 const res = await deliver(digest, { to });
 return { digestId: digest.id, period, sent: res.sent, draft: !res.sent, preview: res.preview || digest.text };
}

function list(limit = 30) { return store.load().digests.slice(-limit).reverse(); }

module.exports = { build, deliver, run, list };
