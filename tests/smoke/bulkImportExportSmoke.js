#!/usr/bin/env node
// tests/smoke/bulkImportExportSmoke.js — Smoke test for CSV round-trip + export. Run: npm run import-export:smoke

const ie = require('../../lib/bulkImportExport');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ie.importEngine, 'engine present');

 // CSV stringify escapes special chars, and parse reads them back.
 const rows = [{ a: 'x,y', b: 'line1\nline2', c: 'plain' }];
 const out = ie.csv.stringify(rows, ['a', 'b', 'c']);
 const back = ie.csv.parse(out);
 t(back.rows[0].a === 'x,y', 'comma survives round-trip');
 t(back.rows[0].b === 'line1\nline2', 'embedded newline survives round-trip');

 // Tags column split on ; or |
 const csvText = 'phone,tags\n+923001234567,vip;lahore\n';
 const prev = ie.importEngine.run({ csvText, commit: false });
 t(prev.valid === 1, 'row with tags validates');
 t(prev.validSample[0].tags.includes('vip') && prev.validSample[0].tags.includes('lahore'), 'tags split into a list');

 // Job history records the run.
 const jobs = ie.importEngine.listJobs(5);
 t(jobs.length >= 1 && jobs[0].totals, 'import job recorded in history');

 // Export degrades gracefully whether or not contacts dept is present.
 const csvExport = ie.exportEngine.toCSV();
 t(typeof csvExport === 'string' && csvExport.split('\n')[0].includes('id'), 'export produces a CSV header even when empty');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
