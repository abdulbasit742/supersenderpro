'use strict';
// #77 Reviews & Ratings — CLI check. Run: npm run reviews:check
const reviews = require('../lib/reviews');
const r = reviews.doctor.check();
console.log('=== Reviews & Ratings Doctor ===');
console.log('enabled:', r.enabled, '| healthy:', r.healthy);
r.ok.forEach(o => console.log('  ok  -', o));
r.issues.forEach(i => console.log('  !!  -', i));
console.log('stats:', JSON.stringify(r.stats));
process.exit(r.healthy ? 0 : 1);
