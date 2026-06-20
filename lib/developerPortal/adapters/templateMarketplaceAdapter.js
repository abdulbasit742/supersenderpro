// developerPortal/adapters/templateMarketplaceAdapter.js — safe adapter for Template Marketplace.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Template Marketplace', detectFiles:['server.js'], events:['template.install_preview_created'] });
