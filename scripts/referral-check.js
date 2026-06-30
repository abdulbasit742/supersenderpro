'use strict';
// #74 Referral Program — CLI check. Run: npm run referral:check
const referral = require('../lib/referral');
const r = referral.doctor.check();
console.log('=== Referral Program Doctor ===');
console.log('enabled:', r.enabled, '| healthy:', r.healthy);
r.ok.forEach(o => console.log('  ok  -', o));
r.issues.forEach(i => console.log('  !!  -', i));
console.log('stats:', JSON.stringify(r.stats));
process.exit(r.healthy ? 0 : 1);
