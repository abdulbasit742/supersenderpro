'use strict';
// #83 Product Catalog & Variants — CLI check. Run: npm run catalog:check
const catalog = require('../lib/catalog');
const r = catalog.doctor.check();
console.log('=== Product Catalog Doctor ===');
console.log('enabled:', r.enabled, '| healthy:', r.healthy);
r.ok.forEach(o => console.log('  ok  -', o));
r.issues.forEach(i => console.log('  !!  -', i));
console.log('stats:', JSON.stringify(r.stats));
process.exit(r.healthy ? 0 : 1);
