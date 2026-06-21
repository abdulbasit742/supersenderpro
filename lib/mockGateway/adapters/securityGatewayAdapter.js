'use strict';
const b = require('./_base');
function status() { return b.anyExists(['lib/securityScan/scanner.js', 'routes/securityScanRoutes.js']) ?
b.ok('securityGateway', 'security scan present') : b.unavailable('securityGateway'); }
module.exports = { status };
