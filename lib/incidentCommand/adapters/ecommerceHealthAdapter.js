'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['src/modules/catalog', 'src/modules/shopify', 'lib/groupCommerce/ecommerceBridge.js']);
  if (!present) return b.unavailable('Ecommerce');
  return b.record('healthy', 'Ecommerce/catalog present', { category: 'ecommerce', recommendedFix: 'If orders fail, check provider config + catalog store.' });
}
module.exports = { health };
