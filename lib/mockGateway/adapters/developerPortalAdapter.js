'use strict';
const b = require('./_base');
function status() { return b.anyExists(['lib/developerPortal', 'src/modules/publicApi']) ? b.ok('developerPortal') :
b.unavailable('developerPortal'); }
module.exports = { status };
