// developerPortal/adapters/integrationMarketplaceAdapter.js — safe adapter for Integration Marketplace.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Integration Marketplace', detectFiles:['server.js'], events:['generic.system_notice'] });
