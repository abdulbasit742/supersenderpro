#!/usr/bin/env node
// tests/smoke/analyticsSmoke.js — Smoke test for rollups + KPI snapshot. Run: npm run analytics:smoke

const an = require('../../lib/analytics');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!an.eventTracker, 'tracker present');

 an.track({ event: 'smoke_evt', value: 5, dimensions: { plan: 'pro' } });
 an.track({ event: 'smoke_evt', value: 3, dimensions: { plan: 'starter' } });

 const tot = an.rollups.totals(an.eventTracker.all(), { event: 'smoke_evt' });
 t(tot.count >= 2 && tot.sum >= 8, 'totals sum event values');

 const bd = an.rollups.breakdown(an.eventTracker.all(), { event: 'smoke_evt', dimension: 'plan' });
 t(bd.some((r) => r.key === 'pro') && bd.some((r) => r.key === 'starter'), 'breakdown groups by dimension');

 const snap = an.kpiSnapshot.snapshot();
 t(snap && typeof snap.events.total === 'number', 'KPI snapshot returns event totals');
 t('billing' in snap && 'support' in snap && 'drip' in snap, 'KPI snapshot includes cross-department blocks (null if absent)');

 const csv = an.csvExport.toCSV([{ a: 'x,y', b: 'he said "hi"' }], ['a', 'b']);
 t(csv.includes('"x,y"') && csv.includes('"he said ""hi"""'), 'CSV escapes commas and quotes');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
