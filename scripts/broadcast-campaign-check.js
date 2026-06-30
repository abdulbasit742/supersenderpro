'use strict';

// Standalone doctor runner: node scripts/broadcast-campaign-check.js
const doctor = require('../lib/broadcastCampaign/doctor');
const result = doctor.check();
for (const c of result.checks) {
  console.log((c.ok ? 'PASS' : 'FAIL') + '  ' + c.name + (c.detail ? '  (' + c.detail + ')' : ''));
}
console.log('\n' + (result.ok ? 'OK: broadcast campaign composer healthy' : 'PROBLEMS FOUND'));
process.exit(result.ok ? 0 : 1);
