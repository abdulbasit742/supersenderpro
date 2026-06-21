'use strict';
const b = require('./_base');
function health() {
    const present = b.anyExists(['lib/superflow/engine.js', 'src/modules/flows']);
    if (!present) return b.unavailable('Flow Studio');
    return b.record('healthy', 'Flow Studio present (dry-run simulator)', { category: 'flow_studio' });
}
module.exports = { health };
