// lib/unifiedSetup/credentialChecklist.js
// Presence-only credential checklist for the Unified Setup Wizard.
// It never returns secret values; only set/missing status and exact env names.

const CREDENTIAL_GROUPS = [
  {
    id: 'admin_security',
    label: 'Admin security',
    category: 'security',
    required: true,
    env: ['JWT_SECRET', 'ADMIN_AUTH_PASSWORD'],
    fix: 'Set JWT_SECRET and ADMIN_AUTH_PASSWORD before production launch.'
  },
  {
    id: 'admin_whatsapp',
    label: 'Admin WhatsApp number',
    category: 'whatsapp',
    required: true,
    env: ['ADMIN_NUMBER'],
    alternatives: ['OWNER_WHATSAPP'],
    fix: 'Set ADMIN_NUMBER=923xxxxxxxxx for admin alerts and commands.'
  },
  {
    id: 'whatsapp_cloud',
    label: 'WhatsApp Cloud API',
    category: 'whatsapp',
    required: false,
    env: ['WHATSAPP_CLOUD_PHONE_NUMBER_ID', 'WHATSAPP_CLOUD_ACCESS_TOKEN', 'WHATSAPP_CLOUD_VERIFY_TOKEN'],
    fix: 'Add Meta Cloud API credentials when you switch from QR/Baileys to official API.'
  },
  {
    id: 'payments',
    label: 'Payment receiving details',
    category: 'payments',
    required: true,
    env: ['JAZZCASH_NUMBER', 'EASYPAISA_NUMBER', 'BANK_ACCOUNT'],
    fix: 'Set JazzCash, Easypaisa, and bank account details for checkout messages.'
  },
  {
    id: 'payment_email_parser',
    label: 'Payment email parser',
    category: 'payments',
    required: false,
    env: ['EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_IMAP_HOST'],
    fix: 'Set IMAP/Gmail credentials if automatic payment email verification is enabled.'
  },
  {
    id: 'ai_provider',
    label: 'AI provider',
    category: 'ai',
    required: false,
    anyOf: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'NVIDIA_API_KEY'],
    fix: 'Set at least one AI provider key for advanced AI replies and content generation.'
  },
  {
    id: 'google_sheets',
    label: 'Google Sheets sync',
    category: 'reporting',
    required: false,
    env: ['GOOGLE_SHEETS_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'],
    fix: 'Set Google Sheets service account values for report sync.'
  },
  {
    id: 'n8n',
    label: 'n8n workflow bridge',
    category: 'automation',
    required: false,
    env: ['N8N_WEBHOOK_SECRET'],
    alternatives: ['N8N_WEBHOOK_URL'],
    fix: 'Set n8n webhook URL/secret to trigger external workflows.'
  },
  {
    id: 'social_meta',
    label: 'Meta Facebook/Instagram',
    category: 'social',
    required: false,
    env: ['META_APP_ID', 'META_APP_SECRET'],
    alternatives: ['FB_PAGE_ACCESS_TOKEN', 'INSTAGRAM_ACCESS_TOKEN'],
    fix: 'Use OAuth app credentials or page tokens for social publishing.'
  },
  {
    id: 'linkedin',
    label: 'LinkedIn publishing',
    category: 'social',
    required: false,
    env: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    alternatives: ['LINKEDIN_ACCESS_TOKEN'],
    fix: 'Set LinkedIn OAuth credentials or access token for LinkedIn posting.'
  },
  {
    id: 'tiktok',
    label: 'TikTok publishing',
    category: 'social',
    required: false,
    env: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    alternatives: ['TIKTOK_ACCESS_TOKEN'],
    fix: 'Set TikTok OAuth credentials or token for TikTok publishing.'
  },
  {
    id: 'public_url',
    label: 'Public base URL',
    category: 'deployment',
    required: false,
    anyOf: ['PUBLIC_BASE_URL', 'SOCIAL_PUBLIC_BASE_URL', 'FRONTEND_URL'],
    fix: 'Set a public tunnel/domain URL for webhooks and OAuth callbacks.'
  }
];

function isSet(name) {
  return !!String(process.env[name] || '').trim();
}

function maskPresence(name) {
  return isSet(name) ? 'set' : 'missing';
}

function evaluateGroup(group) {
  const env = Array.isArray(group.env) ? group.env : [];
  const alternatives = Array.isArray(group.alternatives) ? group.alternatives : [];
  const anyOf = Array.isArray(group.anyOf) ? group.anyOf : [];

  const requiredEnvMissing = env.filter(name => !isSet(name));
  const alternativesSet = alternatives.filter(isSet);
  const anyOfSet = anyOf.filter(isSet);

  let set = false;
  if (env.length) set = requiredEnvMissing.length === 0;
  if (!set && alternatives.length) set = alternativesSet.length > 0;
  if (!set && anyOf.length) set = anyOfSet.length > 0;

  const missing = env.length && !set ? requiredEnvMissing : [];
  const status = set ? 'configured' : group.required ? 'missing_required' : 'optional_missing';

  return {
    id: group.id,
    label: group.label,
    category: group.category || 'general',
    required: !!group.required,
    status,
    set,
    env: env.map(name => ({ name, status: maskPresence(name) })),
    alternatives: alternatives.map(name => ({ name, status: maskPresence(name) })),
    anyOf: anyOf.map(name => ({ name, status: maskPresence(name) })),
    missing,
    fix: group.fix || ''
  };
}

function build() {
  return CREDENTIAL_GROUPS.map(evaluateGroup);
}

function summary() {
  const checklist = build();
  const required = checklist.filter(item => item.required);
  const optional = checklist.filter(item => !item.required);
  const requiredMissing = required.filter(item => !item.set).map(item => item.id);
  const optionalMissing = optional.filter(item => !item.set).map(item => item.id);
  const configured = checklist.filter(item => item.set).map(item => item.id);

  return {
    total: checklist.length,
    configuredCount: configured.length,
    requiredCount: required.length,
    requiredConfiguredCount: required.filter(item => item.set).length,
    optionalCount: optional.length,
    requiredMissing,
    optionalMissing,
    configured
  };
}

module.exports = {
  CREDENTIAL_GROUPS,
  build,
  summary
};
