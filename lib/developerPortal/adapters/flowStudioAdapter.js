// developerPortal/adapters/flowStudioAdapter.js — safe adapter for Flow Studio.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Flow Studio', detectFiles:['server.js'], events:['generic.system_notice'] });
