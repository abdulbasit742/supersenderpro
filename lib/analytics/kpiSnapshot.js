// lib/analytics/kpiSnapshot.js — Cross-department KPI snapshot. Reads (best-effort, non-fatal)
// from the other departments' public overviews + analytics rollups to build one dashboard
// payload. Never throws if a department is missing; each block degrades to null.

const eventTracker = require('./eventTracker');
const rollups = require('./rollups');

function _safe(fn) { try { return fn(); } catch (_e) { return null; } }

function snapshot() {
 let billing = null, support = null, drip = null;
 _safe(() => { const saas = require('../saasBilling'); billing = saas.billingStatus.overview(); });
 _safe(() => { const si = require('../supportInbox'); support = si.ticketEngine.overview(); });
 _safe(() => { const dc = require('../dripCampaigns'); drip = dc.enrollmentEngine.overview(); });

 const events = eventTracker.all();
 return {
 generatedAt: new Date().toISOString(),
 events: {
 total: events.length,
 last7Days: rollups.totals(events.filter((e) => Date.parse(e.at) >= Date.now() - 7 * 864e5)),
 byEvent: rollups.breakdown(events, { dimension: '__event__' }).length ? null : undefined,
 },
 billing: billing ? { activeTenants: billing.cards.activeTenants, trials: billing.cards.trials, pastDue: billing.cards.pastDue, monthlyRevenueDraft: billing.cards.monthlyRevenueDraft, invoicesDue: billing.cards.invoicesDue } : null,
 support: support ? { open: support.cards.open, pending: support.cards.pending, slaBreaches: support.cards.slaBreaches, unassigned: support.cards.unassigned } : null,
 drip: drip ? { activeJourneys: drip.cards.activeJourneys, activeEnrollments: drip.cards.activeEnrollments, completed: drip.cards.completed, stepsSent: drip.cards.stepsSent } : null,
 };
}

module.exports = { snapshot };
