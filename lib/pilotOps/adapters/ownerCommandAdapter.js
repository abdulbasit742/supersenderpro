'use strict';
const b = require('./_base');
function health() { return b.anyExists(['lib/ownerCommand', 'routes/ownerCommandRoutes.js']) ? b.ok('Owner Command present') : b.unavailable('Owner Command'); }
module.exports = { health };
