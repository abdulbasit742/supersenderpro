 'use strict';
 const b = require('./_base');
 function status() { return b.anyExists(['lib/demoSandbox', 'src/modules/demo']) ? b.ok('demoSandbox') :
 b.unavailable('demoSandbox'); }
 module.exports = { status };
