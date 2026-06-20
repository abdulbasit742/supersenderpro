// developerPortal/adapters/kpiCommandAdapter.js — safe adapter for KPI Command.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'KPI Command', detectFiles:['lib/aiDashboard.js', 'server.js'], events:['deployment.readiness_checked'] });
