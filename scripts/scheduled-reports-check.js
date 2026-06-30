#!/usr/bin/env node
// scripts/scheduled-reports-check.js — Offline safety + behavior check. Run: npm run scheduled-reports:check

const sr = require('../lib/scheduledReports');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(sr && sr.reportEngine, 'module loads');
 assert(sr.config.effective.liveDelivery === false, 'delivery is draft-only by default (safe)');

 // Reject unknown source + bad format.
 let threw = false; try { sr.reportEngine.create({ name: 'bad', sources: ['nope'] }); } catch (_e) { threw = true; }
 assert(threw, 'rejects an unknown source');
 threw = false; try { sr.reportEngine.create({ name: 'bad', sources: ['analytics'], format: 'pdf' }); } catch (_e) { threw = true; }
 assert(threw, 'rejects an unsupported format');

 // Create a JSON report + run it. Missing source depts degrade to null but the report still builds.
 const jsonRep = sr.reportEngine.create({ name: 'Daily KPIs', sources: ['analytics', 'support', 'billing'], format: 'json' });
 const run1 = await sr.reportEngine.run(jsonRep.id);
 assert(run1.runId && run1.format === 'json', 'JSON report runs and archives');
 assert(run1.delivered === false && run1.deliveryDraft === true, 'delivery drafted, not sent (safe default)');
 const content = sr.reportEngine.runContent(run1.runId);
 assert(content && content.content.includes('collectedAt'), 'archived run holds the snapshot content');

 // CSV report renders key,value rows.
 const csvRep = sr.reportEngine.create({ name: 'CSV Export', sources: ['analytics'], format: 'csv' });
 const run2 = await sr.reportEngine.run(csvRep.id);
 const csvContent = sr.reportEngine.runContent(run2.runId);
 assert(csvContent.content.split('\n')[0] === 'source,key,value', 'CSV report has the expected header');

 // Retention: runs are capped per report.
 for (let i = 0; i < 3; i++) await sr.reportEngine.run(jsonRep.id);
 const runs = sr.reportEngine.runs(jsonRep.id, 100);
 assert(runs.length <= sr.config.maxRunsPerReport, 'run history is capped per report');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all scheduled-reports checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
