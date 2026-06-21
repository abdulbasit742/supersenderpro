'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['src/modules/billing', 'lib/billing']);
  if (!present) return b.unavailable('SaaS Billing');
  const enforce = b.envTrue('BILLING_ENFORCEMENT_ENABLED');
  const auth = b.anyExists(['lib/adminAuth', 'src/modules/auth']);
  if (enforce && !auth) return b.record('degraded', 'Billing enforcement on without admin auth detected', { category:
'billing', severity: 'high', recommendedFix: 'Gate billing enforcement behind admin auth/RBAC.' });
  return b.record('healthy', 'SaaS billing present', { category: 'billing' });
}
module.exports = { health };
