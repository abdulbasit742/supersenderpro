#!/usr/bin/env node
// tests/smoke/scheduledReportsSmoke.js — Smoke test for snapshot + CSV render + scheduling. Run: npm run scheduled-reports:smoke

const sr = require('../../lib/scheduledReports');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!sr.reportEngine, 'engine present');

 // Snapshot is non-fatal across all known sources.
 const snap = sr.sources.snapshot(sr.SOURCES);
 t(typeof snap.collectedAt === 'string' && Array.isArray(snap.available), 'snapshot collects across sources non-fatally');

 // CSV helpers.
 const csv = sr.csv.fromRows([{ a: 'x,y', b: 1 }], ['a', 'b']);
 t(csv.includes('"x,y"'), 'CSV escapes commas');
 const kv = sr.csv.fromObject({ open: 3, pending: 1 });
 t(kv.split('\n')[0] === 'key,value' && kv.includes('open,3'), 'object->CSV produces key,value rows');

 // Create a scheduled report; if cron lib is present it computes a nextRunAt.
 const rep = sr.reportEngine.create({ name: 'Weekly', sources: ['analytics'], format: 'json', schedule: '0 8 * * 1', timezone: 'Asia/Karachi' });
 if (sr.reportEngine.overview().cronAvailable) {
 t(!!sr.reportEngine.get(rep.id).nextRunAt, 'scheduled report gets a nextRunAt when cron lib present');
 } else {
 t(true, 'cron lib not present; scheduling deferred (manual run still works)');
 }

 // run-due processes nothing when nothing is due yet (nextRunAt in the future).
 const due = await sr.reportEngine.runDue(Date.now());
 t(typeof due.processed === 'number', 'runDue returns a processed count');

 // Manual run always works regardless of schedule.
 const r = await sr.reportEngine.run(rep.id);
 t(r.runId && r.deliveryDraft === true, 'manual run builds + drafts delivery');

 const ov = sr.reportEngine.overview();
 t(typeof ov.cards.reports === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
