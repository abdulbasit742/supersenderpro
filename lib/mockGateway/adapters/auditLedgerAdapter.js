'use strict';
const b = require('./_base');
function status() { return b.anyExists(['lib/auditLedger', 'src/modules/audit']) ? b.ok('auditLedger') :
b.unavailable('auditLedger'); }
module.exports = { status };
