'use strict';
const b = require('./_base');
function status() { return b.anyExists(['src/modules/social', 'lib/groupCommerce/adapters/socialAdapter.js']) ?
b.ok('social') : b.unavailable('social'); }
module.exports = { status };
