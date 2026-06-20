// lib/saasBilling/featureCatalog.js — Canonical catalog of feature gates and usage limit keys.
// This is metadata only; it does not enable/disable any existing module. The featureGate
// consults this to know which features/limits exist and how they map to SuperSender modules.

const FEATURES = [
  'whatsapp_bot', 'whatsapp_cloud', 'channel_automation', 'social_bridge',
  'ecommerce_hub', 'customer_360', 'voice_ai', 'marketplace_intelligence',
  'group_commerce', 'ai_agent_deployment', 'owner_command', 'playbook_builder',
  'business_setup', 'flow_studio', 'analytics_reports', 'google_sheets',
  'n8n_bridge', 'api_access', 'white_label', 'reseller_portal', 'priority_support',
];

const LIMIT_KEYS = [
  'whatsappAccounts', 'whatsappChannels', 'connectedSocialAccounts', 'ecommerceStores',
  'aiAgents', 'voiceMinutes', 'ttsCharacters', 'sttMinutes', 'channelPostsPerDay',
  'socialPostsPerDay', 'customer360Profiles', 'marketplaceItems', 'flowRunsPerMonth',
  'automationRules', 'teamMembers', 'storageMb', 'apiCallsPerMonth',
];

// Usage metrics tracked by the usage meter (see usageMeter.js).
const USAGE_METRICS = [
  'whatsapp_messages_sent', 'whatsapp_messages_received', 'channel_posts', 'social_posts',
  'ai_completions', 'ai_tokens_estimated', 'voice_tts_characters', 'voice_stt_minutes',
  'voice_generated_files', 'flow_studio_runs', 'customer360_profiles',
  'ecommerce_products_imported', 'orders_processed', 'marketplace_entities',
  'api_calls', 'team_member_seats', 'storage_estimate_mb',
];

// Human-readable labels (used by dashboard + docs). Missing keys fall back to the raw key.
const LABELS = {
  whatsapp_bot: 'WhatsApp Bot', whatsapp_cloud: 'WhatsApp Cloud API',
  channel_automation: 'Channel Automation', social_bridge: 'Social Bridge',
  ecommerce_hub: 'Ecommerce Hub', customer_360: 'Customer 360', voice_ai: 'Voice AI',
  marketplace_intelligence: 'Marketplace Intelligence', group_commerce: 'Group Commerce',
  ai_agent_deployment: 'AI Agent Deployment', owner_command: 'Owner Command',
  playbook_builder: 'Playbook Builder', business_setup: 'Business Setup Wizard',
  flow_studio: 'Flow Studio', analytics_reports: 'Analytics & Reports',
  google_sheets: 'Google Sheets', n8n_bridge: 'n8n Bridge', api_access: 'API Access',
  white_label: 'White Label', reseller_portal: 'Reseller Portal', priority_support: 'Priority Support',
};

function isFeature(f) { return FEATURES.includes(f); }
function isLimit(k) { return LIMIT_KEYS.includes(k); }
function isMetric(m) { return USAGE_METRICS.includes(m); }
function label(key) { return LABELS[key] || key; }

module.exports = { FEATURES, LIMIT_KEYS, USAGE_METRICS, LABELS, isFeature, isLimit, isMetric, label };
