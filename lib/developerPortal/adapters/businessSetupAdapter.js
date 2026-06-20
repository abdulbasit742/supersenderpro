// developerPortal/adapters/businessSetupAdapter.js — safe adapter for Business Setup.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Business Setup', detectFiles:['server.js'], events:['tenant.setup_preview_created'] });
