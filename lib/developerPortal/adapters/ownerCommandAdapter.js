// developerPortal/adapters/ownerCommandAdapter.js — safe adapter for Owner Command.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Owner Command', detectFiles:['server.js'], events:['owner.digest_created'] });
