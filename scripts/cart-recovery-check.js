'use strict';
// CLI: node scripts/cart-recovery-check.js
// Prints the cartRecovery doctor report. Exit 1 if issues found.
const cart = require('../lib/cartRecovery');
const r = cart.check();
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 1);
