// ============================================================
// SuperSender Pro - Auto Bug Fixer
// Run: node scripts/fixAllBugs.js
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');

console.log('Auto Bug Fixer Starting...\n');

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const dirs = [
  'data',
  'bots',
  'saas',
  'automations',
  'integrations',
  'scripts',
  'public',
  'ai',
  'uploads'
];

for (const dir of dirs) {
  const target = path.join(ROOT, dir);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
    console.log(`Created: ${dir}/`);
  }
}

const jsonFiles = {
  'customers.json': [],
  'payments.json': [],
  'orders.json': [],
  'templates.json': [],
  'issues.json': [],
  'links.json': [],
  'link_clicks.json': [],
  'hot_click_leads.json': [],
  'calling_channel_log.json': [],
  'agent_learning_log.json': [],
  'integration_directory.json': [],
  'reminders.json': [],
  'campaigns.json': [],
  'ab_tests.json': [],
  'ab_results.json': [],
  'wa_accounts.json': [{ id: 'default', name: 'Primary WhatsApp', enabled: true }],
  'wa_rotation_state.json': { currentIndex: 0, lastTenantId: 'default', sentCounts: {}, updatedAt: null },
  'inbox_presence.json': {},
  'group_member_tags.json': [],
  'group_events.json': [],
  'group_finder_links.json': [],
  'group_finder_scans.json': [],
  'journey_events.json': [],
  'carousel_templates.json': [],
  'whatsapp_forms.json': [],
  'whatsapp_form_submissions.json': [],
  'agent_routing_rules.json': [],
  'retargeting_campaigns.json': [],
  'custom_logic_rules.json': [],
  'ai_training_sources.json': [],
  'appointments.json': [],
  'handoff_queue.json': [],
  'inbox_assignments.json': {},
  'n8n_events.json': [],
  'n8n_dashboard_state.json': {},
  'polls.json': [],
  'platform_controls.json': {},
  'action_triggers.json': [],
  'template_approvals.json': [],
  'communities.json': [],
  'sla_policies.json': {},
  'hitl_drafts.json': [],
  'privacy_controls.json': {},
  'licenses.json': [],
  'update_checks.json': [],
  'whatsapp_catalogs.json': [],
  'bulk_sends.json': [],
  'contacts.json': [],
  'workflows.json': [],
  'flows.json': [],
  'flow_submissions.json': [],
  'quick_replies.json': [],
  'plans.json': [],
  'reviews.json': [],
  'invoices.json': [],
  'price_intel.json': [],
  'message_log.json': [],
  'logs.json': [],
  'webhook_logs.json': [],
  'alerts.json': [],
  'blacklist.json': [],
  'send_safety_log.json': [],
  'safety_settings.json': {
    enabled: true,
    smartDelayEnabled: true,
    minDelaySeconds: 4,
    maxDelaySeconds: 9,
    perNumberHourlyLimit: 8,
    perNumberDailyLimit: 35,
    globalHourlyLimit: 150,
    globalDailyLimit: 700,
    pauseAfterMessages: 30,
    pauseSeconds: 60,
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '09:00',
    quietTimezone: 'Asia/Karachi',
    requireOptIn: false,
    unsubscribeKeywords: ['stop', 'unsubscribe', 'band', 'mat bhejo', 'no message']
  },
  're_tenants.json': [],
  're_properties_default.json': [],
  're_visits_default.json': [],
  'paperclip_log.json': [],
  'commerce_settings.json': {
    enabled: true,
    storeName: 'SuperSender Pro',
    adminNotify: true,
    customerNotify: true,
    abandonedCartHours: 1,
    orderStatusField: 'status',
    adminPhone: '',
    shopifyWebhookSecret: '',
    woocommerceWebhookSecret: '',
    abandonedCartMessage: 'Hi {name}, your cart is still waiting. Reply now to complete your order.'
  },
  'commerce_events.json': [],
  'group_analytics.json': {},
  'group_autoreplies.json': [
    {
      id: 'gr1',
      groupId: 'all',
      keyword: 'price',
      matchType: 'contains',
      reply: '💰 Prices check karne ke liye: wa.me/923326550431',
      active: true,
      cooldownMinutes: 5
    },
    {
      id: 'gr2',
      groupId: 'all',
      keyword: 'rate',
      matchType: 'contains',
      reply: '📊 Current rates ke liye directly contact karein: 0332-6550431',
      active: true,
      cooldownMinutes: 5
    }
  ],
  'group_broadcast_log.json': [],
  'hot_signals.json': [],
  'group_reply_log.json': [],
  'agents.json': [
    { id: 'sales-agent', emoji: '💼', name: 'Sales Agent', role: 'WhatsApp Sales', goal: 'Close leads and guide customers to order.', instructions: 'Reply briefly in the user language.', status: 'active' },
    { id: 'catalog-agent', emoji: '💻', name: 'Product Catalog Agent', role: 'Laptop/Product Advisor', goal: 'Recommend products from catalog.', instructions: 'Mention stock, price and next question.', status: 'active' },
    { id: 'support-agent', emoji: '🎧', name: 'Customer Support Agent', role: 'Support & Follow-up', goal: 'Handle customer issues and route to admin.', instructions: 'Be helpful and ask one clear next question.', status: 'active' }
  ],
  'automation_log.json': [],
  'settings.json': {
    business_name: 'SuperSender Pro',
    admin_phone: '',
    wa_engine: 'wwebjs',
    bot_enabled: true,
    laptop_bot_enabled: true,
    scholarship_bot_enabled: true,
    real_estate_bot_enabled: true,
    welcome_message: true,
    auto_reply: true,
    guest_auto_save: true,
    unsubscribe_footer_enabled: true,
    unsubscribe_footer: 'Reply STOP to unsubscribe.',
    auto_update_enabled: false,
    update_manifest_url: '',
    white_label_name: 'SuperSender Pro',
    white_label_logo: '',
    ui_language: 'en',
    staff_privacy_enabled: false,
    staff_privacy_mask_phone: true,
    staff_privacy_mask_email: true,
    staff_privacy_allowed_roles: ['admin'],
    parallel_messaging_enabled: true,
    messenger_enabled: true,
    audio_bot_enabled: true,
    location_sharing_enabled: true,
    contact_sharing_enabled: true,
    smart_handoff_enabled: true,
    reply_speed_tracking_enabled: true,
    click_hot_lead_enabled: true,
    coexistence_mode_enabled: true,
    calling_channel_enabled: true,
    audio_ai_reply_enabled: true,
    audio_transcription_model: 'whisper-large-v3-turbo',
    ai_reply_language: 'auto',
    ai_reply_dialect: '',
    ai_reply_tone: 'friendly_sales',
    ai_reply_custom_instructions: '',
    message_variation_enabled: true,
    message_variation_openers: 'Assalam o Alaikum {{name}}\nHi {{name}}\nHello {{name}}',
    message_variation_closers: 'Agar interest ho to reply karein.\nAaj ka best option chahiye ho to batayein.\nAap ke budget ke mutabiq option share kar deta hoon.',
    logic_conditions_enabled: true,
    account_rotation_enabled: true,
    account_rotation_strategy: 'round_robin',
    n8n_enabled: false,
    n8n_base_url: 'http://localhost:5678',
    n8n_webhook_secret: '',
    n8n_order_webhook_url: '',
    n8n_dealer_rate_webhook_url: '',
    n8n_broadcast_webhook_url: '',
    n8n_payment_webhook_url: '',
    n8n_followup_webhook_url: '',
    n8n_dashboard_sync_webhook_url: '',
    ai_policy_mode: 'structured_only',
    allow_open_ended_ai: false,
    semantic_guard_enabled: true,
    explicit_opt_in_required: false,
    marketing_api_enabled: true,
    marketing_default_ttl_hours: 24,
    marketing_weekly_limit: 2,
    performance_reach_mode: 'engagement',
    utility_window_hours: 24,
    ai_allowed_use_cases: ['support', 'booking', 'order_tracking', 'lead_capture'],
    multi_channel_channels: ['whatsapp', 'facebook', 'instagram'],
    gdpr_mode_enabled: true,
    vcf_sending_enabled: true,
    voice_transcripts_enabled: true,
    product_extractor_enabled: true,
    fb_page_access_token: '',
    fb_verify_token: '',
    paperclip_url: 'http://localhost:3000',
    paperclip_api_key: '',
    paperclip_enabled: false,
    paperclip_auto_sync: false,
    auto_reply_message: 'Assalam o Alaikum! Hamara bot abhi available hai.',
    working_hours_start: '09:00',
    working_hours_end: '21:00',
    currency: 'PKR',
    language: 'ur'
  }
};

for (const [file, defaultValue] of Object.entries(jsonFiles)) {
  const target = path.join(DATA, file);
  if (!fs.existsSync(target)) {
    writeJSON(target, defaultValue);
    console.log(`Created: data/${file}`);
    continue;
  }
  try {
    const raw = fs.readFileSync(target, 'utf8').trim();
    if (!raw) throw new Error('empty');
    const parsed = JSON.parse(raw);
    if (file === 'settings.json' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const merged = { ...defaultValue, ...parsed };
      writeJSON(target, merged);
    }
  } catch {
    writeJSON(target, defaultValue);
    console.log(`Repaired: data/${file}`);
  }
}

const productPath = path.join(DATA, 'laptop_products.json');
const products = readJSON(productPath, []);
if (!Array.isArray(products)) {
  writeJSON(productPath, []);
  console.log('Reset laptop_products.json');
} else {
  const fixedProducts = products.map((product, index) => ({
    ...product,
    id: product.id || `prod_${index}_${Date.now()}`,
    name: product.name || 'Unknown Product',
    brand: product.brand || 'Unknown',
    price: typeof product.price === 'number' ? product.price : Number(product.price || 0),
    stock: product.stock !== false,
    condition: product.condition || 'Used',
    image: product.image || '',
    description: product.description || '',
    specs: product.specs || ''
  }));
  writeJSON(productPath, fixedProducts);
  console.log(`Checked ${fixedProducts.length} products`);
}

const envPath = path.join(ROOT, '.env');
if (!fs.existsSync(envPath)) {
  const example = path.join(ROOT, '.env.example');
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, envPath);
  } else {
    fs.writeFileSync(envPath, [
      'PORT=3001',
      'WA_ENGINE=wwebjs',
      'ADMIN_NUMBER=923001234567@c.us',
      'GROQ_API_KEY=',
      'SUPER_ADMIN_KEY=supersender2024',
      'STORE_NAME=SuperSender Pro',
      'NODE_ENV=production'
    ].join('\n'));
  }
  console.log('Created: .env');
}

const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = readJSON(pkgPath, {});
  let changed = false;

  if (!pkg.scripts) {
    pkg.scripts = {};
    changed = true;
  }
  const scripts = {
    start: 'node server.js',
    health: 'node scripts/healthCheck.js',
    fix: 'node scripts/fixAllBugs.js',
    'test:api': 'node scripts/testAllAPIs.js'
  };
  for (const [key, value] of Object.entries(scripts)) {
    if (!pkg.scripts[key]) {
      pkg.scripts[key] = value;
      changed = true;
    }
  }

  if (changed) {
    writeJSON(pkgPath, pkg);
    console.log('Fixed: package.json scripts');
  }
}

const tenants = readJSON(path.join(DATA, 're_tenants.json'), []);
if (Array.isArray(tenants)) {
  for (const tenant of tenants) {
    if (!tenant.tenantId) continue;
    const propFile = path.join(DATA, `re_properties_${tenant.tenantId}.json`);
    const visitFile = path.join(DATA, `re_visits_${tenant.tenantId}.json`);
    if (!fs.existsSync(propFile)) {
      writeJSON(propFile, []);
      console.log(`Created property file for tenant: ${tenant.tenantId}`);
    }
    if (!fs.existsSync(visitFile)) writeJSON(visitFile, []);
  }
}

const msgLogPath = path.join(DATA, 'message_log.json');
const msgLogs = readJSON(msgLogPath, []);
if (Array.isArray(msgLogs) && msgLogs.length > 5000) {
  writeJSON(msgLogPath, msgLogs.slice(-2000));
  console.log(`Trimmed message_log.json: ${msgLogs.length} -> 2000 entries`);
}

const logsPath = path.join(DATA, 'logs.json');
const logs = readJSON(logsPath, []);
if (Array.isArray(logs) && logs.length > 5000) {
  writeJSON(logsPath, logs.slice(-2000));
  console.log(`Trimmed logs.json: ${logs.length} -> 2000 entries`);
}

console.log('\n' + '='.repeat(50));
console.log('All fixes applied.');
console.log('='.repeat(50));
console.log('\nNext steps:');
console.log('  1. node scripts/healthCheck.js');
console.log('  2. node server.js');
console.log('  3. node scripts/testAllAPIs.js');
console.log('\nProject ready.\n');
