'use strict';
// #58 Shipping — CLI self-check. Usage: node scripts/shipping-check.js
const { doctor } = require('../lib/shipping');
const r = doctor.run();
console.log(JSON.stringify(r, null, 2));
process.exit(r.pass ? 0 : 1);
