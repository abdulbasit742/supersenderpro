'use strict';
const b = require('./_base');
// READ-ONLY. Never creates a tenant.
function tenant() {
    if (!b.anyExists(['src/modules/tenant', 'lib/tenantPortal'])) return b.unavailable('Tenant Portal');
    return b.ok('Tenant portal present (read-only)', { tenantWrite: 'disabled_by_pilot_ops' });
}
module.exports = { tenant, health: tenant };
