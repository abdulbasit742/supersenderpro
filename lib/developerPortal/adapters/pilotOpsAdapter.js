// developerPortal/adapters/pilotOpsAdapter.js — safe adapter for Pilot Ops.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Pilot Ops', detectFiles:['server.js'], events:['pilot.onboarding_started', 'pilot.risk_detected'] });
