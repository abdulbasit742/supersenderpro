// developerPortal/adapters/customer360Adapter.js — safe adapter for Customer 360.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Customer 360', detectFiles:['lib/storeCRM.js', 'lib/kommoCRM.js'], events:['customer360.profile_preview_created'] });
