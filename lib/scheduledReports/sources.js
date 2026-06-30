// lib/scheduledReports/sources.js — Pull a point-in-time snapshot from another department's public
// overview. Best-effort + non-fatal: if a dept isn't installed, that source returns null instead of
// throwing, so a report still builds from whatever IS present. Read-only.

function _safe(fn) { try { return fn(); } catch (_e) { return null; } }

function collect(source) {
 switch (source) {
 case 'analytics': return _safe(() => require('../analytics').kpiSnapshot.snapshot());
 case 'billing': return _safe(() => require('../saasBilling').billingStatus.overview());
 case 'support': return _safe(() => require('../supportInbox').ticketEngine.overview());
 case 'drip': return _safe(() => require('../dripCampaigns').enrollmentEngine.overview());
 case 'links': return _safe(() => require('../shortLinks').analytics.overview());
 case 'sender_health': return _safe(() => require('../senderHealth').governor.overview());
 case 'consent': return _safe(() => require('../consentCenter').consentEngine.overview());
 default: return null;
 }
}

// Build a combined snapshot for a list of sources -> { [source]: data|null, available:[...] }.
function snapshot(sources = []) {
 const out = {};
 const available = [];
 for (const s of sources) { const data = collect(s); out[s] = data; if (data) available.push(s); }
 return { collectedAt: new Date().toISOString(), sources: out, available };
}

module.exports = { collect, snapshot };
