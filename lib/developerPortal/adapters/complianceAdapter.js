// developerPortal/adapters/complianceAdapter.js — safe adapter for Compliance Center.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Compliance Center', detectFiles:['lib/watiBroadcast.js', 'server.js'], events:['compliance.warning_created'] });
