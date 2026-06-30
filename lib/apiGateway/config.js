// lib/apiGateway/config.js — Safe config for the Public API Keys + Outbound Webhooks department.
// JSON-backed like the rest of the app. API key SECRETS are never stored in plaintext (only a
// SHA-256 hash + a short masked prefix). Webhook delivery is DRY-RUN by default: the dispatcher
// computes + records what WOULD be delivered, but performs no network call until live delivery is
// enabled. Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.API_GATEWAY_ENABLED, true),
 // Live outbound webhook delivery (real HTTP POST). Off by default = dry-run (recorded, not sent).
 liveWebhookDelivery: bool(process.env.API_GATEWAY_LIVE_WEBHOOKS, false),
 // Default per-key rate limit (requests per minute) when a key doesn't specify one.
 defaultRateLimitPerMin: num(process.env.API_GATEWAY_DEFAULT_RATE_LIMIT, 120),
 // Webhook retry policy.
 maxWebhookRetries: num(process.env.API_GATEWAY_MAX_WEBHOOK_RETRIES, 5),
 retryBaseSeconds: num(process.env.API_GATEWAY_RETRY_BASE_SECONDS, 30),
 // Prefix for issued keys so they're recognizable (secret portion is random).
 keyPrefix: process.env.API_GATEWAY_KEY_PREFIX || 'ssk',
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.API_GATEWAY_STORE_PATH, 'data/api-gateway.json'),
 },
};

config.effective = { liveWebhookDelivery: config.enabled && config.liveWebhookDelivery };

// Known scopes a key can be granted. '*' grants all.
const SCOPES = ['contacts:read', 'contacts:write', 'messages:send', 'campaigns:read', 'campaigns:write', 'analytics:read', 'webhooks:manage', '*'];

module.exports = { config, bool, num, ROOT, DATA_DIR, SCOPES };
