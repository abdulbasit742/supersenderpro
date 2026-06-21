 'use strict';
 const b = require('./_base');
 function status() { return b.anyExists(['public/demo-sandbox.html', 'public/demo.html', 'lib/demoSandbox']) ?
 b.ok('localDemo', 'demo assets detected') : b.unavailable('localDemo'); }
 module.exports = { status };
