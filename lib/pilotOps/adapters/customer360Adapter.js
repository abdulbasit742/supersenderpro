'use strict';
const b = require('./_base');
function profile() {
  if (!b.anyExists(['src/modules/customer360', 'lib/customer360', 'src/modules/crm'])) return b.unavailable('Customer 360');
  return b.ok('Customer 360 present', { note: 'Contact previews must be masked.' });
}
module.exports = { profile, health: profile };
