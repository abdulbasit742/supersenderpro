'use strict';
const b = require('./_base');
function status() { return b.anyExists(['lib/adminAuth', 'src/modules/auth', 'lib/rbac']) ? b.ok('teamAccess') :
b.unavailable('teamAccess'); }
module.exports = { status };
