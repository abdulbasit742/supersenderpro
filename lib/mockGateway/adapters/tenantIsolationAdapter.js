'use strict';
const b = require('./_base');
function status() { return b.anyExists(['lib/tenantPortal', 'src/modules/tenant']) ? b.ok('tenantIsolation') :
b.unavailable('tenantIsolation'); }
module.exports = { status };
