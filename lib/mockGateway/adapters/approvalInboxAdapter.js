 'use strict';
 const b = require('./_base');
 function status() { return b.anyExists(['lib/approvalInbox', 'src/modules/approvals']) ? b.ok('approvalInbox') :
 b.unavailable('approvalInbox'); }
 module.exports = { status };
