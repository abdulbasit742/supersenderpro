// orchestrator.js coordinates tasks among multiple specialized AI agents.
const salesAgent = require('./agents/salesAgent');
const selfHealingAgent = require('./agents/selfHealingAgent');

async function routeTask(agentName, payload) {
  if (agentName === 'sales') {
    return salesAgent.handleSalesConversation(payload.phone, payload.message);
  } else if (agentName === 'selfHealing') {
    return selfHealingAgent.runDiagnostic();
  }
  return { success: false, reason: 'Unknown agent' };
}

module.exports = { routeTask };
