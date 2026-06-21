 'use strict';
 const b = require('./_base');
 // READ-ONLY. Never activates billing.
 function billing() {
   if (!b.anyExists(['src/modules/billing', 'lib/billing'])) return b.unavailable('SaaS Billing');

    return b.ok('SaaS billing present (read-only)', { activation: 'disabled_by_pilot_ops' });
}
module.exports = { billing, health: billing };
