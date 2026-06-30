#!/usr/bin/env node
// scripts/bulk-import-export-check.js — Offline safety + behavior check. Run: npm run import-export:check

const ie = require('../lib/bulkImportExport');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ie && ie.importEngine, 'module loads');

 // CSV parser handles quoted commas + escaped quotes.
 const p = ie.csv.parse('name,phone\n"Doe, John",03001234567\n"She said ""hi""",+923009998877\n');
 assert(p.headers.length === 2 && p.rows.length === 2, 'CSV parses header + 2 rows');
 assert(p.rows[0].name === 'Doe, John', 'quoted comma preserved');
 assert(p.rows[1].name === 'She said "hi"', 'escaped quotes preserved');

 // Auto column mapping + validation + PK normalization, dry-run (no commit).
 const csvText = 'Full Name,Mobile,Town\nAli,03001234567,Lahore\nBadEmail,not-a-number,Karachi\n,,';
 const preview = ie.importEngine.run({ csvText, commit: false });
 assert(preview.dryRun === true, 'import defaults to dry-run');
 assert(preview.rows === 3, 'counts all data rows');
 assert(preview.valid === 1 && preview.invalid === 2, 'valid/invalid split: 1 good, 2 bad (bad phone, empty row)');
 assert(preview.mapping.phone === 'Mobile' && preview.mapping.name === 'Full Name', 'auto-maps Mobile->phone, Full Name->name');
 assert(preview.validSample[0].phoneMasked.indexOf('1234567') === -1, 'valid sample phone is masked');

 // Explicit mapping + fields folding.
 const csv2 = 'cell,city\n0300-1112223,Multan\n';
 const prev2 = ie.importEngine.run({ csvText: csv2, mapping: { phone: 'cell', fields: { city: 'city' } }, commit: false });
 assert(prev2.valid === 1, 'explicit phone mapping validates the row');

 // No phone/email column at all -> helpful error.
 let threw = false; try { ie.importEngine.run({ csvText: 'foo,bar\n1,2\n', commit: false }); } catch (_e) { threw = true; }
 assert(threw, 'rejects a CSV with no mappable phone/email column');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all import-export checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
