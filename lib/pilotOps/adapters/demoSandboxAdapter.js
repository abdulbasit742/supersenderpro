'use strict';
const b = require('./_base');
function demo() {
  if (!b.anyExists(['src/modules/demo', 'lib/demoSandbox', 'public/demo.html'])) return b.unavailable('Demo Sandbox');
    return b.ok('Demo sandbox present');
}
module.exports = { demo, health: demo };
