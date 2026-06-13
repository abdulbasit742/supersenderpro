// ============================================================
// SuperSender Pro - Complete Health Check & Auto Fix
// Run: node scripts/healthCheck.js
// ============================================================

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const PUBLIC = path.join(ROOT, 'public');

let passed = 0;
let failed = 0;
let fixed = 0;
const issues = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result === false) {
      console.log(`FAIL: ${name}`);
      failed += 1;
      issues.push(name);
    } else {
      console.log(`OK:   ${name}`);
      passed += 1;
    }
  } catch (error) {
    console.log(`ERR:  ${name} - ${error.message}`);
    failed += 1;
    issues.push(`${name}: ${error.message}`);
  }
}

function fix(name, fn) {
  try {
    fn();
    console.log(`FIX:  ${name}`);
    fixed += 1;
  } catch (error) {
    console.log(`SKIP: ${name} - ${error.message}`);
  }
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

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function readEnvFile(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    values[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return values;
}

console.log('\nSuperSender Pro - Health Check Starting\n');
console.log('='.repeat(55));

console.log('\nData Directory Checks:');

const requiredDataFiles = [
  { file: 'customers.json', defaultValue: [] },
  { file: 'payments.json', defaultValue: [] },
  { file: 'orders.json', defaultValue: [] },
  { file: 'templates.json', defaultValue: [] },
  { file: 'issues.json', defaultValue: [] },
  { file: 'links.json', defaultValue: [] },
  { file: 'link_clicks.json', defaultValue: [] },
  { file: 'hot_click_leads.json', defaultValue: [] },
  { file: 'calling_channel_log.json', defaultValue: [] },
  { file: 'agent_learning_log.json', defaultValue: [] },
  { file: 'integration_directory.json', defaultValue: [] },
  { file: 'reminders.json', defaultValue: [] },
  { file: 'campaigns.json', defaultValue: [] },
  { file: 'ab_tests.json', defaultValue: [] },
  { file: 'ab_results.json', defaultValue: [] },
  { file: 'wa_accounts.json', defaultValue: [{ id: 'default', name: 'Primary WhatsApp', enabled: true }] },
  { file: 'wa_rotation_state.json', defaultValue: { currentIndex: 0, lastTenantId: 'default', sentCounts: {}, updatedAt: null } },
  { file: 'inbox_presence.json', defaultValue: {} },
  { file: 'social_accounts.json', defaultValue: [] },
  { file: 'social_posts.json', defaultValue: [] },
  { file: 'social_events.json', defaultValue: [] },
  { file: 'social_auto_posts.json', defaultValue: [] },
  { file: 'video_auto_posts.json', defaultValue: [] },
  { file: 'video_ai_providers.json', defaultValue: [] },
  { file: 'group_member_tags.json', defaultValue: [] },
  { file: 'group_events.json', defaultValue: [] },
  { file: 'group_finder_links.json', defaultValue: [] },
  { file: 'group_finder_scans.json', defaultValue: [] },
  { file: 'journey_events.json', defaultValue: [] },
  { file: 'carousel_templates.json', defaultValue: [] },
  { file: 'whatsapp_forms.json', defaultValue: [] },
  { file: 'whatsapp_form_submissions.json', defaultValue: [] },
  { file: 'agent_routing_rules.json', defaultValue: [] },
  { file: 'retargeting_campaigns.json', defaultValue: [] },
  { file: 'custom_logic_rules.json', defaultValue: [] },
  { file: 'ai_training_sources.json', defaultValue: [] },
  { file: 'appointments.json', defaultValue: [] },
  { file: 'handoff_queue.json', defaultValue: [] },
  { file: 'inbox_assignments.json', defaultValue: {} },
  { file: 'n8n_events.json', defaultValue: [] },
  { file: 'n8n_dashboard_state.json', defaultValue: {} },
  { file: 'polls.json', defaultValue: [] },
  { file: 'platform_controls.json', defaultValue: {} },
  { file: 'action_triggers.json', defaultValue: [] },
  { file: 'template_approvals.json', defaultValue: [] },
  { file: 'communities.json', defaultValue: [] },
  { file: 'sla_policies.json', defaultValue: {} },
  { file: 'hitl_drafts.json', defaultValue: [] },
  { file: 'privacy_controls.json', defaultValue: {} },
  { file: 'licenses.json', defaultValue: [] },
  { file: 'update_checks.json', defaultValue: [] },
  { file: 'whatsapp_catalogs.json', defaultValue: [] },
  { file: 'bulk_sends.json', defaultValue: [] },
  { file: 'contacts.json', defaultValue: [] },
  { file: 'workflows.json', defaultValue: [] },
  { file: 'flows.json', defaultValue: [] },
  { file: 'flow_submissions.json', defaultValue: [] },
  { file: 'quick_replies.json', defaultValue: [] },
  { file: 'plans.json', defaultValue: [] },
  { file: 'reviews.json', defaultValue: [] },
  { file: 'invoices.json', defaultValue: [] },
  { file: 'price_intel.json', defaultValue: [] },
  { file: 'message_log.json', defaultValue: [] },
  { file: 'logs.json', defaultValue: [] },
  { file: 'webhook_logs.json', defaultValue: [] },
  { file: 'alerts.json', defaultValue: [] },
  { file: 'blacklist.json', defaultValue: [] },
  { file: 'send_safety_log.json', defaultValue: [] },
  {
    file: 'safety_settings.json',
    defaultValue: {
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
    }
  },
  { file: 're_tenants.json', defaultValue: [] },
  { file: 're_properties_default.json', defaultValue: [] },
  { file: 're_visits_default.json', defaultValue: [] },
  { file: 'paperclip_log.json', defaultValue: [] },
  {
    file: 'commerce_settings.json',
    defaultValue: {
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
    }
  },
  { file: 'commerce_events.json', defaultValue: [] },
  { file: 'group_analytics.json', defaultValue: {} },
  {
    file: 'group_autoreplies.json',
    defaultValue: [
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
    ]
  },
  { file: 'group_broadcast_log.json', defaultValue: [] },
  { file: 'hot_signals.json', defaultValue: [] },
  { file: 'group_reply_log.json', defaultValue: [] },
  {
    file: 'agents.json',
    defaultValue: [
      { id: 'sales-agent', emoji: '💼', name: 'Sales Agent', role: 'WhatsApp Sales', goal: 'Close leads and guide customers to order.', instructions: 'Reply briefly in the user language.', status: 'active' },
      { id: 'catalog-agent', emoji: '💻', name: 'Product Catalog Agent', role: 'Laptop/Product Advisor', goal: 'Recommend products from catalog.', instructions: 'Mention stock, price and next question.', status: 'active' },
      { id: 'support-agent', emoji: '🎧', name: 'Customer Support Agent', role: 'Support & Follow-up', goal: 'Handle customer issues and route to admin.', instructions: 'Be helpful and ask one clear next question.', status: 'active' }
    ]
  },
  { file: 'laptop_products.json', defaultValue: [] },
  {
    file: 'settings.json',
    defaultValue: {
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
      meta_graph_version: 'v21.0',
      facebook_app_id: '',
      facebook_app_secret: '',
      facebook_page_id: '',
      instagram_page_id: '',
      instagram_ig_user_id: '',
      instagram_access_token: '',
      linkedin_client_id: '',
      linkedin_client_secret: '',
      linkedin_access_token: '',
      linkedin_author_urn: '',
      social_auto_reply_enabled: false,
      social_auto_poster_enabled: true,
      social_auto_post_interval_seconds: 60,
      social_auto_post_directory: 'social-auto-posts',
      social_auto_post_platforms: ['facebook', 'instagram', 'linkedin'],
      social_public_base_url: 'http://localhost:3001',
      video_agent_enabled: true,
      video_auto_post_directory: 'video-auto-posts',
      video_auto_post_interval_seconds: 120,
      video_public_base_url: 'http://localhost:3001',
      paperclip_url: 'http://localhost:3000',
      paperclip_api_key: '',
      paperclip_enabled: false,
      paperclip_auto_sync: false
    }
  }
];

if (!fs.existsSync(DATA)) {
  fix('Create data directory', () => fs.mkdirSync(DATA, { recursive: true }));
}

for (const { file, defaultValue } of requiredDataFiles) {
  const filePath = path.join(DATA, file);
  if (!fs.existsSync(filePath)) {
    fix(`Create missing ${file}`, () => writeJSON(filePath, defaultValue));
  } else {
    check(`${file} valid JSON`, () => {
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      if (!raw) {
        writeJSON(filePath, defaultValue);
        return true;
      }
      JSON.parse(raw);
      return true;
    });
  }
}

console.log('\nJSON Corruption Check:');
for (const { file, defaultValue } of requiredDataFiles) {
  const filePath = path.join(DATA, file);
  if (!fs.existsSync(filePath)) continue;
  check(`${file} not corrupted`, () => {
    try {
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      if (!raw) throw new Error('empty');
      JSON.parse(raw);
      return true;
    } catch {
      fix(`Repair ${file}`, () => writeJSON(filePath, defaultValue));
      return true;
    }
  });
}

console.log('\nSettings Check:');
check('Settings has all required keys', () => {
  const settingsPath = path.join(DATA, 'settings.json');
  const settings = readJSON(settingsPath, {});
  const defaults = requiredDataFiles.find(item => item.file === 'settings.json').defaultValue;
  const missing = Object.keys(defaults).filter(key => settings[key] === undefined);
  if (missing.length) {
    for (const key of missing) settings[key] = defaults[key];
    fix(`Add missing settings: ${missing.join(', ')}`, () => writeJSON(settingsPath, settings));
  }
  return true;
});

console.log('\nSource Files Check:');
[
  'server.js',
  'package.json',
  'public/index.html',
  'wa-sales-bot/index.js',
  'wa-sales-bot/package.json',
  'wa-sales-bot/db/database.js',
  'wa-sales-bot/db/queries.js',
  'wa-sales-bot/bot/messageHandler.js',
  'wa-sales-bot/bot/admin/commands.js',
  'wa-sales-bot/bot/flows/availability.js',
  'wa-sales-bot/bot/flows/issue.js',
  'wa-sales-bot/bot/flows/followup.js',
  'wa-sales-bot/bot/aiAgent/classifier.js',
  'wa-sales-bot/bot/aiAgent/knowledgeBase.js',
  'wa-sales-bot/bot/dealerIntelligence/groupMonitor.js',
  'wa-sales-bot/bot/dealerIntelligence/dealerParser.js',
  'wa-sales-bot/bot/dealerIntelligence/trustManager.js',
  'wa-sales-bot/bot/dealerIntelligence/stockManager.js',
  'wa-sales-bot/bot/dealerIntelligence/priceAnalytics.js',
  'wa-sales-bot/bot/dealerIntelligence/dealerAccess.js',
  'wa-sales-bot/bot/scheduler/cron.js',
  'wa-sales-bot/utils/rateParser.js',
  'wa-sales-bot/utils/formatter.js',
  'wa-sales-bot/utils/policyChecker.js',
  'wa-sales-bot/utils/warrantyChecker.js',
  'backend/src/routes/business.js',
  'backend/src/routes/dealer-intelligence.js',
  'backend/src/routes/n8n.js',
  'backend/src/services/aiAgent.js',
  'backend/src/services/dealerIntelligence.js',
  'backend/src/services/priceAnalytics.js',
  'backend/src/services/warrantyChecker.js',
  'backend/src/services/n8nClient.js',
  'backend/src/config/catalog.js',
  'frontend/app/orders/page.js',
  'frontend/app/customers/page.js',
  'frontend/app/settings/page.js',
  'frontend/app/social/page.js',
  'ai/scholarshipBot.js',
  'bots/realEstateBot.js',
  'saas/reSignup.js',
  'public/re-signup.html',
  'public/re-login.html',
  'public/re-dashboard.html',
  'public/assets/giveaways/moclaw-deepseek-v4-free-trial.png',
  'integrations/paperclipBridge.js',
  'integrations/paperclipWebhook.js',
  'integrations/paperclipAgents.js',
  'integrations/videoAgent.js',
  'video-auto-posts/README.md',
  'video-auto-posts/examples/ai-video-post.json',
  'public/paperclip-panel.html',
  'automations/groupPriceCapture.js',
  'automations/groupBroadcast.js',
  'automations/groupAnalytics.js',
  'automations/groupAutoReply.js'
].forEach(file => {
  check(`${file} exists`, () => fs.existsSync(path.join(ROOT, file)));
});

console.log('\nPackage Dependencies Check:');
check('package.json valid', () => {
  const pkg = readJSON(path.join(ROOT, 'package.json'), null);
  return !!(pkg && pkg.name && pkg.dependencies);
});

check('wa-sales-bot/package.json valid', () => {
  const pkg = readJSON(path.join(ROOT, 'wa-sales-bot', 'package.json'), null);
  return !!(pkg && pkg.name && pkg.dependencies);
});

check('Required dependencies declared', () => {
  const pkg = readJSON(path.join(ROOT, 'package.json'), {});
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const requiredDeps = [
    'express',
    'socket.io',
    'axios',
    'qrcode',
    'node-cron',
    'bcryptjs',
    'compression',
    'cors'
  ];
  const missing = requiredDeps.filter(dep => !deps[dep]);
  if (missing.length) {
    issues.push(`Missing deps: ${missing.join(', ')}`);
    return false;
  }
  return true;
});

check('node_modules exists', () => fs.existsSync(path.join(ROOT, 'node_modules')));
check('wa-sales-bot folder exists', () => fs.existsSync(path.join(ROOT, 'wa-sales-bot')));

console.log('\nEnvironment Check:');
check('.env or .env.example exists', () => (
  fs.existsSync(path.join(ROOT, '.env')) ||
  fs.existsSync(path.join(ROOT, '.env.example'))
));

check('wa-sales-bot .env or .env.example exists', () => (
  fs.existsSync(path.join(ROOT, 'wa-sales-bot', '.env')) ||
  fs.existsSync(path.join(ROOT, 'wa-sales-bot', '.env.example'))
));

check('SESSION_SECRET is production-safe', () => {
  const envValues = readEnvFile(path.join(ROOT, '.env'));
  const value = envValues.SESSION_SECRET || '';
  return value.length >= 32 && !/change|secret_key|replace|default/i.test(value);
});

check('Frontend API example points to backend port', () => {
  const envValues = readEnvFile(path.join(ROOT, 'frontend', '.env.example'));
  return envValues.NEXT_PUBLIC_API_URL === 'http://localhost:3001' &&
    envValues.NEXT_PUBLIC_WS_URL === 'http://localhost:3001';
});

check('Social platform env examples are present', () => {
  const envValues = readEnvFile(path.join(ROOT, '.env.example'));
  return [
    'FACEBOOK_APP_ID',
    'FACEBOOK_PAGE_ID',
    'FB_PAGE_ACCESS_TOKEN',
    'FB_VERIFY_TOKEN',
    'INSTAGRAM_IG_USER_ID',
    'INSTAGRAM_ACCESS_TOKEN',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_ACCESS_TOKEN',
    'LINKEDIN_AUTHOR_URN',
    'SOCIAL_PUBLIC_BASE_URL',
    'VIDEO_AGENT_ENABLED',
    'VIDEO_AUTO_POST_DIR',
    'VIDEO_PROVIDER_1_NAME',
    'VIDEO_PROVIDER_1_API_URL',
    'VIDEO_PROVIDER_1_API_KEY'
  ].every(key => Object.prototype.hasOwnProperty.call(envValues, key));
});

if (!fs.existsSync(path.join(ROOT, '.env'))) {
  fix('Create .env from example', () => {
    const example = path.join(ROOT, '.env.example');
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, path.join(ROOT, '.env'));
    } else {
      fs.writeFileSync(path.join(ROOT, '.env'), [
        'PORT=3001',
        'WA_ENGINE=wwebjs',
        'ADMIN_NUMBER=923001234567@c.us',
        'GROQ_API_KEY=',
        'SUPER_ADMIN_KEY=supersender2024',
        'STORE_NAME=SuperSender Pro'
      ].join('\n'));
    }
  });
}

console.log('\nAutomation Files Check:');
const autoDir = path.join(ROOT, 'automations');
if (!fs.existsSync(autoDir)) {
  fix('Create automations directory', () => fs.mkdirSync(autoDir, { recursive: true }));
} else {
  check('automations directory exists', () => true);
}
[
  'dailySalesReport.js',
  'welcomeNewCustomer.js',
  'stockAlert.js',
  'paymentReminder.js',
  'weeklyReport.js',
  'orderConfirmation.js'
].forEach(file => {
  check(`automations/${file} exists`, () => fs.existsSync(path.join(autoDir, file)));
});

console.log('\nReal Estate Bot Check:');
check('Real Estate tenant file exists', () => fs.existsSync(path.join(DATA, 're_tenants.json')));
check('Real Estate default properties file exists', () => fs.existsSync(path.join(DATA, 're_properties_default.json')));
check('Real Estate default visits file exists', () => fs.existsSync(path.join(DATA, 're_visits_default.json')));

console.log('\nPaperclip Integration Check:');
check('Paperclip log file exists', () => fs.existsSync(path.join(DATA, 'paperclip_log.json')));
check('Paperclip settings are present', () => {
  const settings = readJSON(path.join(DATA, 'settings.json'), {});
  return (
    settings.paperclip_url !== undefined &&
    settings.paperclip_api_key !== undefined &&
    settings.paperclip_enabled !== undefined &&
    settings.paperclip_auto_sync !== undefined
  );
});

console.log('\nData Integrity Check:');
check('Customers data is an array', () => Array.isArray(readJSON(path.join(DATA, 'customers.json'), [])));
check('Payments data is an array', () => Array.isArray(readJSON(path.join(DATA, 'payments.json'), [])));
check('Products have required fields', () => {
  const file = path.join(DATA, 'laptop_products.json');
  const products = readJSON(file, []);
  if (!Array.isArray(products)) return false;
  const invalid = products.filter(product => !product.id || !product.name);
  if (invalid.length) {
    fix(`Fix ${invalid.length} products missing id/name`, () => {
      const fixedProducts = products.map((product, index) => ({
        ...product,
        id: product.id || `prod_${index}`,
        name: product.name || 'Unknown Product',
        price: Number(product.price || 0),
        stock: product.stock !== false
      }));
      writeJSON(file, fixedProducts);
    });
  }
  return true;
});

check('Real Estate tenant property files exist', () => {
  const tenants = readJSON(path.join(DATA, 're_tenants.json'), []);
  if (!Array.isArray(tenants)) return false;
  for (const tenant of tenants) {
    if (!tenant.tenantId) continue;
    const propFile = path.join(DATA, `re_properties_${tenant.tenantId}.json`);
    const visitFile = path.join(DATA, `re_visits_${tenant.tenantId}.json`);
    if (!fs.existsSync(propFile)) writeJSON(propFile, []);
    if (!fs.existsSync(visitFile)) writeJSON(visitFile, []);
  }
  return true;
});

function checkServer() {
  return new Promise(resolve => {
    const req = http.get('http://127.0.0.1:3001/api/health', res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(Boolean(json.ok || json.status === 'ok' || json.status === 'healthy'));
        } catch {
          resolve(res.statusCode === 200);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function printSummary() {
  const serverAlive = await checkServer();
  console.log(`\nServer at :3001: ${serverAlive ? 'RUNNING' : 'NOT RUNNING'}`);

  console.log('\n' + '='.repeat(55));
  console.log('HEALTH CHECK SUMMARY');
  console.log('='.repeat(55));
  console.log(`Passed: ${passed}`);
  console.log(`Fixed:  ${fixed}`);
  console.log(`Failed: ${failed}`);

  if (issues.length) {
    console.log('\nIssues Found:');
    issues.forEach(issue => console.log(` - ${issue}`));
  }

  if (failed === 0) {
    console.log('\n100% HEALTHY: Project checks passed.\n');
  } else {
    console.log('\nRun node scripts/fixAllBugs.js, then run this health check again.\n');
  }

  writeJSON(path.join(ROOT, 'health_report.json'), {
    timestamp: new Date().toISOString(),
    passed,
    fixed,
    failed,
    serverAlive,
    issues
  });
  console.log('Report saved: health_report.json\n');
}

printSummary();
