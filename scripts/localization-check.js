'use strict';
// #86 Multi-Language & Localization — CLI check. Run: npm run localization:check
const loc = require('../lib/localization');
const r = loc.doctor.check();
console.log('=== Localization Doctor ===');
console.log('enabled:', r.enabled, '| healthy:', r.healthy);
r.ok.forEach(o => console.log('  ok  -', o));
r.issues.forEach(i => console.log('  !!  -', i));
console.log('stats:', JSON.stringify(r.stats));
process.exit(r.healthy ? 0 : 1);
