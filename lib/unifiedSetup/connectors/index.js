// lib/unifiedSetup/connectors/index.js — Aggregates all module connectors.

const connectors = {
  admin_auth: require('./adminAuthConnector'),
  security_scan: require('./securityConnector'),
  launch_center: require('./launchConnector'),
  whatsapp_local: require('./whatsappConnector'),
  whatsapp_cloud: require('./whatsappCloudConnector'),
  ecommerce: require('./ecommerceConnector'),
  payments: require('./paymentConnector'),
  social: require('./socialConnector'),
  google_sheets: require('./sheetsN8nConnector'),
  ai_providers: require('./aiProviderConnector'),
  voice_ai: require('./voiceAIConnector'),
  channel_automation: require('./channelAutomationConnector'),
  group_commerce: require('./groupCommerceConnector'),
  marketplace_intelligence: require('./marketplaceConnector'),
  customer_360: require('./customer360Connector'),
  agent_deployment: require('./agentDeploymentConnector'),
  playbooks: require('./playbookConnector'),
  owner_command: require('./ownerCommandConnector'),
};

function allStatuses() {
  return Object.values(connectors).map((c) => c.status());
}

function byId(id) { return connectors[id] ? connectors[id].status() : null; }

module.exports = { connectors, allStatuses, byId };
