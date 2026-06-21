'use strict';
const b = require('./_base');

function status() { return b.anyExists(['lib/supportHelpdesk', 'src/modules/support']) ? b.ok('supportHelpdesk') :
b.unavailable('supportHelpdesk'); }
module.exports = { status };
