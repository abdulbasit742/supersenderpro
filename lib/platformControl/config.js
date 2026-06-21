// lib/platformControl/config.js
// Advanced Platform Control + Observability + Safety OS — shared configuration & read-only fs helpers.
// Everything here is read-only and never performs network/live actions.
'use strict';

const fs = require('fs');
const path = require('path');

// Project root = two levels up from lib/platformControl
const ROOT = path.join(__dirname, '..', '..');

const FEATURE_KEY = 'PLATFORM_CONTROL_ENABLED';

// Canonical safety flags attached to (almost) every response.
function safetyFlags(extra) {
  return Object.assign({
    ok: true,
    dryRun: true,
    readOnly: true,
    liveActionsEnabled: false,
    externalCallsEnabled: false,
    piiMasked: true,
    secretsExposed: false,
  }, extra || {});
}

// ---- read-only filesystem helpers (never write, never follow network) ----
function abs(rel) { return path.join(ROOT, rel || ''); }
function exists(rel) { try { return fs.existsSync(abs(rel)); } catch (_) { return false; } }
function isDir(rel) { try { return fs.statSync(abs(rel)).isDirectory(); } catch (_) { return false; } }
function readText(rel) { try { return fs.readFileSync(abs(rel), 'utf8'); } catch (_) { return ''; } }
function listDir(rel) { try { return fs.readdirSync(abs(rel)); } catch (_) { return []; } }
function listFiles(rel, ext) {
  return listDir(rel).filter((f) => {
    if (isDir(path.join(rel, f))) return false;
    return ext ? f.toLowerCase().endsWith(ext) : true;
  });
}
function anyExists(list) { return (list || []).some((r) => exists(r)); }

// Read declared (not real) env keys from .env.example for presence-only scanning.
function envExampleKeys() {
  const txt = readText('.env.example');
  const keys = [];
  txt.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Z][A-Z0-9_]+)\s*=/);
    if (m && keys.indexOf(m[1]) === -1) keys.push(m[1]);
  });
  return keys;
}

function isSecretKey(k) {
  return /(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY|ACCESS_TOKEN|ENCRYPTION_KEY|CLIENT_SECRET|VERIFY_TOKEN|WEBHOOK_SECRET)/.test(String(k));
}
function isFeatureFlagKey(k) {
  return /(_ENABLED|_DRY_RUN|_DISABLE|_ALLOW_|_REQUIRE_|_STRICT|_FALLBACK_ENABLED)$|^FEATURE_/.test(String(k));
}

// Minimal required keys for the app to be considered "release ready" (presence only).
const REQUIRED_ENV = ['NODE_ENV', 'PORT', 'SESSION_SECRET'];
const RECOMMENDED_ENV = ['JWT_SECRET', 'ENCRYPTION_KEY', 'ADMIN_NUMBER'];

// Representative secret keys checked for presence (values never read or returned).
const SECRET_KEYS = [
  'SESSION_SECRET', 'JWT_SECRET', 'ENCRYPTION_KEY', 'ADMIN_PASSWORD',
  'WHATSAPP_CLOUD_ACCESS_TOKEN', 'WHATSAPP_CLOUD_VERIFY_TOKEN', 'WHATSAPP_CLOUD_WEBHOOK_SECRET',
  'TELEGRAM_BOT_TOKEN', 'FB_PAGE_ACCESS_TOKEN', 'INSTAGRAM_ACCESS_TOKEN', 'LINKEDIN_ACCESS_TOKEN',
  'GOOGLE_PRIVATE_KEY', 'GOOGLE_OAUTH_CLIENT_SECRET', 'TAVILY_API_KEY', 'FIRECRAWL_API_KEY',
  'DB_PASSWORD', 'DATABASE_URL', 'REDIS_URL', 'SUPERSENDER_API_KEY',
];

// File hints used by readiness scanners (existence only, no connectivity).
const HINTS = {
  whatsappLocal: ['lib/watiBroadcast.js', 'lib/watiCopilot.js', 'node_modules/@whiskeysockets/baileys', 'node_modules/whatsapp-web.js'],
  whatsappCloud: ['lib/whatsappCloudSetup', 'lib/whatsappCloudTemplates', 'routes/whatsappCloudSetupRoutes.js', 'public/whatsapp-cloud-setup.html'],
  webhooks: ['lib/webhookDispatcher.js', 'routes/wati.js', 'routes/kommo.js'],
  templates: ['lib/whatsappCloudTemplates', 'public/templates.html', 'routes/templateMarketplaceRoutes.js'],
  campaigns: ['lib/channelAutomationCenter.js', 'routes/channelAutomation.js', 'lib/queueManager.js'],
  ai: ['lib/aiAgent.js', 'lib/aiDashboard.js', 'lib/storeAIAgent.js', 'lib/productBotEngine.js', 'lib/voiceAI'],
  aiEnv: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'GROQ_API_KEY', 'OLLAMA_HOST', 'TAVILY_API_KEY'],
  rag: ['lib/webScraper.js', 'ai', 'lib/marketing'],
  queue: ['lib/queueManager.js', 'lib/stockMutex.js'],
  queueEnv: ['REDIS_URL', 'ZERO_TOUCH_ENABLE_BULL'],
  database: ['lib/txnStore.js', 'lib/storeCRM.js', 'data'],
  databaseEnv: ['DATABASE_URL', 'DB_HOST', 'REDIS_URL'],
  storage: ['data', 'artifacts', 'public/file-library'],
  rateLimit: ['lib/securityGateway', 'routes/securityGatewayRoutes.js'],
  backup: ['scripts/backup-data.js', 'scripts/restore-data.js', 'BACKUP_MANIFEST.txt'],
  audit: ['routes/complianceCenterRoutes.js', 'lib/complianceCenter', 'lib/featureFlags'],
  logs: ['data', 'artifacts'],
};

// Known module categories to present in the module registry (existence-checked).
const MODULE_CATALOG = [
  { name: 'server', path: 'server.js', category: 'core' },
  { name: 'queueManager', path: 'lib/queueManager.js', category: 'queue' },
  { name: 'webhookDispatcher', path: 'lib/webhookDispatcher.js', category: 'integration' },
  { name: 'aiAgent', path: 'lib/aiAgent.js', category: 'ai' },
  { name: 'aiDashboard', path: 'lib/aiDashboard.js', category: 'ai' },
  { name: 'watiBroadcast', path: 'lib/watiBroadcast.js', category: 'whatsapp' },
  { name: 'channelAutomationCenter', path: 'lib/channelAutomationCenter.js', category: 'campaign' },
  { name: 'whatsappCloudSetup', path: 'lib/whatsappCloudSetup', category: 'whatsapp_cloud' },
  { name: 'whatsappCloudTemplates', path: 'lib/whatsappCloudTemplates', category: 'whatsapp_cloud' },
  { name: 'securityGateway', path: 'lib/securityGateway', category: 'security' },
  { name: 'complianceCenter', path: 'lib/complianceCenter', category: 'audit' },
  { name: 'featureFlags', path: 'lib/featureFlags', category: 'config' },
  { name: 'tenantIsolation', path: 'lib/tenantIsolation', category: 'security' },
  { name: 'voiceAI', path: 'lib/voiceAI', category: 'ai' },
  { name: 'txnStore', path: 'lib/txnStore.js', category: 'storage' },
];

// Dashboard pages we expect to exist (existence-checked, never created/removed).
const DASHBOARD_PAGES = [
  'index.html', 'platform-control.html', 'feature-flags.html', 'security-gateway.html',
  'compliance-center.html', 'whatsapp-cloud-setup.html', 'developer-portal.html',
  'customer-portal.html', 'staff-portal.html', 'dealer-portal.html', 'vendor-portal.html',
  'franchise-portal.html', 'team-access.html', 'marketplace-intelligence.html',
];

module.exports = {
  ROOT, FEATURE_KEY, safetyFlags,
  abs, exists, isDir, readText, listDir, listFiles, anyExists,
  envExampleKeys, isSecretKey, isFeatureFlagKey,
  REQUIRED_ENV, RECOMMENDED_ENV, SECRET_KEYS, HINTS, MODULE_CATALOG, DASHBOARD_PAGES,
};
