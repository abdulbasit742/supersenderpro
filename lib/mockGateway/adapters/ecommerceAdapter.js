'use strict';
const b = require('./_base');
function status() { return b.anyExists(['src/modules/catalog', 'src/modules/shopify',
'lib/groupCommerce/ecommerceBridge.js']) ? b.ok('ecommerce') : b.unavailable('ecommerce'); }
module.exports = { status };
