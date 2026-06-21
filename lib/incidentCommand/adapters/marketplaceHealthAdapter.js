'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['src/modules/marketplace', 'lib/marketplace']);
  if (!present) return b.unavailable('Marketplace');
  return b.record('healthy', 'Marketplace intelligence present', { category: 'marketplace' });
}
module.exports = { health };
