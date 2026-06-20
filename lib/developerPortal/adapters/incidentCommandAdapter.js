// developerPortal/adapters/incidentCommandAdapter.js — safe adapter for Incident.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Incident', detectFiles:['server.js'], events:['incident.created'] });
