'use strict';
// #80 Abandoned Cart Recovery — CLI check. Run: npm run cart-recovery:check
const cart = require('../lib/cartRecovery');
const r = cart.doctor.check();
console.log('=== Abandoned Cart Recovery Doctor ===');
console.log('enabled:', r.enabled, '| healthy:', r.healthy);
r.ok.forEach(o => console.log('  ok  -', o));
r.issues.forEach(i => console.log('  !!  -', i));
console.log('stats:', JSON.stringify(r.stats));
process.exit(r.healthy ? 0 : 1);
