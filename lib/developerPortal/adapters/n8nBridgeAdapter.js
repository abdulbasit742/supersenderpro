// developerPortal/adapters/n8nBridgeAdapter.js — safe adapter for n8n Bridge.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'n8n Bridge', detectFiles:['integrations/n8nBridge.js'], events:['generic.system_notice'] });
