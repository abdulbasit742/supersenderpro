'use strict';
const b = require('./_base');
function status() { return b.anyExists(['lib/featureFlags', 'config/flags.json']) ? b.ok('featureFlags') :
b.unavailable('featureFlags'); }
module.exports = { status };
