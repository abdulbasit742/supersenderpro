// lib/platformControl/integrationHealth.js — read-only integration presence preview. No external calls.
'use strict';
const cfg = require('./config');

function getIntegrationHealth() {
  const integrations = [
    { name: 'whatsapp_cloud', hint: cfg.HINTS.whatsappCloud },
    { name: 'whatsapp_local', hint: cfg.HINTS.whatsappLocal },
    { name: 'webhooks', hint: cfg.HINTS.webhooks },
    { name: 'ai', hint: cfg.HINTS.ai },
    { name: 'queue', hint: cfg.HINTS.queue },
    { name: 'security', hint: cfg.HINTS.rateLimit },
    { name: 'audit', hint: cfg.HINTS.audit },
  ];
  const integrationsPreview = integrations.map((i) => ({
    name: i.name,
    detectedPreview: cfg.anyExists(i.hint),
    liveConnectivityChecked: false,
  }));
  return cfg.safetyFlags({
    externalCallsEnabled: false,
    integrationsPreview,
    totalDetectedPreview: integrationsPreview.filter((i) => i.detectedPreview).length,
    warnings: [], blockers: [],
  });
}
module.exports = { getIntegrationHealth };
