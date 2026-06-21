'use strict';


/**
    * Incident Command — registry of monitored modules + which adapter summarizes each.
    * Adapters are loaded lazily + defensively so a missing module never breaks the layer.
    */

const MODULES = [
  { id: 'whatsapp', name: 'WhatsApp', category: 'whatsapp', adapter: 'whatsappHealthAdapter' },
  { id: 'channel_automation', name: 'Channel Automation', category: 'channel_automation', adapter:
'channelAutomationHealthAdapter' },
     { id: 'social', name: 'Social', category: 'social', adapter: 'socialHealthAdapter' },
     { id: 'ecommerce', name: 'Ecommerce', category: 'ecommerce', adapter: 'ecommerceHealthAdapter' },
     { id: 'payments', name: 'Payments', category: 'payments', adapter: 'paymentHealthAdapter' },
     { id: 'billing', name: 'SaaS Billing', category: 'billing', adapter: 'saasBillingHealthAdapter' },
     { id: 'voice_ai', name: 'Voice AI', category: 'voice_ai', adapter: 'voiceAIHealthAdapter' },
     { id: 'customer_360', name: 'Customer 360', category: 'customer_360', adapter: 'customer360HealthAdapter' },
     { id: 'marketplace', name: 'Marketplace', category: 'marketplace', adapter: 'marketplaceHealthAdapter' },
     { id: 'group_commerce', name: 'Group Commerce', category: 'group_commerce', adapter: 'groupCommerceHealthAdapter' },
     { id: 'ai_agents', name: 'AI Agents', category: 'ai_agents', adapter: 'agentDeploymentHealthAdapter' },
     { id: 'flow_studio', name: 'Flow Studio', category: 'flow_studio', adapter: 'flowStudioHealthAdapter' },
     { id: 'backup_restore', name: 'Backup / Restore', category: 'backup_restore', adapter: 'backupRestoreHealthAdapter' },
     { id: 'security', name: 'Security', category: 'security', adapter: 'securityHealthAdapter' },
     { id: 'launch', name: 'Launch', category: 'launch', adapter: 'launchHealthAdapter' },
];


function list() { return MODULES.slice(); }

function loadAdapter(name) {
     try { return require('./adapters/' + name); }
     catch (e) { return null; }
}

module.exports = { MODULES, list, loadAdapter };
