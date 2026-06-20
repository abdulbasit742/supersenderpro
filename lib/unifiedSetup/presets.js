// lib/unifiedSetup/presets.js — Business type presets used by the autopilot planner.
// Each preset lists the recommended setup steps (by step id) in priority order.

const BUSINESS_TYPES = [
  'ai_tools_reseller', 'ecommerce_store', 'education_admissions', 'real_estate',
  'support_center', 'local_services', 'digital_products', 'marketplace_seller',
  'agency', 'custom',
];

const PRESETS = {
  ai_tools_reseller: {
    label: 'AI Tools Reseller',
    recommended: ['business_profile', 'admin_auth', 'security_scan', 'whatsapp_local', 'payments',
      'ecommerce', 'ai_providers', 'voice_ai', 'channel_automation', 'owner_command', 'launch_center', 'pilot_launch'],
    optional: ['voice_ai', 'channel_automation', 'marketplace_intelligence'],
  },
  ecommerce_store: {
    label: 'Ecommerce Store',
    recommended: ['business_profile', 'admin_auth', 'security_scan', 'ecommerce', 'payments',
      'channel_automation', 'social', 'google_sheets', 'n8n', 'customer_360', 'marketplace_intelligence', 'launch_center', 'pilot_launch'],
    optional: ['voice_ai', 'group_commerce'],
  },
  education_admissions: {
    label: 'Education / Admissions',
    recommended: ['business_profile', 'admin_auth', 'whatsapp_local', 'customer_360', 'voice_ai',
      'google_sheets', 'social', 'playbooks', 'launch_center', 'pilot_launch'],
    optional: ['ai_providers', 'channel_automation'],
  },
  real_estate: {
    label: 'Real Estate',
    recommended: ['business_profile', 'admin_auth', 'whatsapp_local', 'customer_360', 'voice_ai',
      'social', 'playbooks', 'launch_center', 'pilot_launch'],
    optional: ['ai_providers', 'marketplace_intelligence'],
  },
  support_center: {
    label: 'Support Center',
    recommended: ['business_profile', 'admin_auth', 'whatsapp_local', 'voice_ai', 'ai_providers',
      'customer_360', 'playbooks', 'launch_center', 'pilot_launch'],
    optional: ['channel_automation'],
  },
  local_services: {
    label: 'Local Services',
    recommended: ['business_profile', 'whatsapp_local', 'payments', 'customer_360', 'social', 'launch_center', 'pilot_launch'],
    optional: ['voice_ai', 'google_sheets'],
  },
  digital_products: {
    label: 'Digital Products',
    recommended: ['business_profile', 'admin_auth', 'ecommerce', 'payments', 'ai_providers',
      'channel_automation', 'social', 'launch_center', 'pilot_launch'],
    optional: ['voice_ai', 'marketplace_intelligence'],
  },
  marketplace_seller: {
    label: 'Marketplace Seller',
    recommended: ['business_profile', 'ecommerce', 'payments', 'marketplace_intelligence',
      'group_commerce', 'channel_automation', 'customer_360', 'launch_center', 'pilot_launch'],
    optional: ['social', 'voice_ai'],
  },
  agency: {
    label: 'Agency',
    recommended: ['business_profile', 'admin_auth', 'tenant_registry', 'ai_providers', 'channel_automation',
      'social', 'agent_deployment', 'playbooks', 'launch_center', 'pilot_launch'],
    optional: ['voice_ai', 'marketplace_intelligence'],
  },
  custom: {
    label: 'Custom',
    recommended: ['business_profile', 'admin_auth', 'security_scan', 'launch_center', 'pilot_launch'],
    optional: [],
  },
};

function get(type) { return PRESETS[type] || PRESETS.custom; }

module.exports = { BUSINESS_TYPES, PRESETS, get };
