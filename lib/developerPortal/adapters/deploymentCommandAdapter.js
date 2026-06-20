// developerPortal/adapters/deploymentCommandAdapter.js — safe adapter for Deployment.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Deployment', detectFiles:['deploy.sh', 'server.js'], events:['deployment.readiness_checked'] });
