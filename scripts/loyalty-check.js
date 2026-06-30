'use strict';
// #71 Loyalty & Points — CLI check. Run: npm run loyalty:check
const loyalty = require('../lib/loyalty');
const r = loyalty.doctor.check();
console.log('=== Loyalty & Points Doctor ===');
console.log('enabled:', r.enabled, '| healthy:', r.healthy);
r.ok.forEach(o => console.log('  ok  -', o));
r.issues.forEach(i => console.log('  !!  -', i));
console.log('stats:', JSON.stringify(r.stats));
process.exit(r.healthy ? 0 : 1);
