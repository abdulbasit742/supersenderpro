#!/usr/bin/env node
// scripts/audit-log-check.js — Offline safety + tamper-evidence check. Run: npm run audit-log:check

const al = require('../lib/auditLog');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(al && al.record, 'module loads');

 // Append a few records.
 const a = al.record({ actor: 'user:1', action: 'contact.create', target: 'con-1', metadata: { name: 'Ali', password: 'hunter2', phone: '+923001234567' } });
 al.record({ actor: 'user:1', action: 'message.send', target: 'con-1', metadata: { text: 'hi' } });
 al.record({ actor: 'apikey:k1', action: 'campaign.update', target: 'cmp-9' });
 assert(a && a.hash && a.prevHash, 'record gets a hash + prevHash');

 // Redaction: secrets dropped, phone masked.
 assert(a.metadata.password === '[redacted]', 'sensitive key redacted');
 assert(String(a.metadata.phone).indexOf('1234567') === -1, 'phone value masked in metadata');

 // Chain verifies intact.
 const d = al.store.load();
 const v = al.hashChain.verify(d.records, d.anchorHash);
 assert(v.valid === true, 'hash chain verifies intact after appends');

 // Tamper: mutate a past record in memory and confirm verification breaks.
 const tampered = JSON.parse(JSON.stringify(d.records));
 tampered[0].action = 'contact.delete'; // change history
 const v2 = al.hashChain.verify(tampered, d.anchorHash);
 assert(v2.valid === false && v2.brokenAt === 0, 'tampering with a past record breaks the chain at that index');

 // Deletion is also detectable (removing a middle record).
 const removed = d.records.slice(0, 1).concat(d.records.slice(2));
 const v3 = al.hashChain.verify(removed, d.anchorHash);
 assert(v3.valid === false, 'deleting a record breaks the chain');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all audit-log checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
