'use strict';
const b = require('./_base');
function health() {
  const core = b.anyExists(['lib/groupCommerce/store.js']);
  const inbox = b.anyExists(['lib/groupCommerce/inbox/store.js']);
  if (!core && !inbox) return b.unavailable('Group Commerce');
  let summary = 'Group Commerce OS present';
  if (inbox) summary += ' + inbox layer';
  return b.record('healthy', summary, { category: 'group_commerce', affectedFiles: ['lib/groupCommerce/store.js',
'lib/groupCommerce/inbox/store.js'] });
}
module.exports = { health };
