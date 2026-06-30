// lib/apiGateway/index.js — Public API Keys + Outbound Webhooks (barrel export).
//
// Issue/revoke/rotate SCOPED API keys (hashed at rest, plaintext shown once), an Express auth
// middleware that enforces scopes + per-key rate limits, and an outbound webhook system:
// subscriptions per event with HMAC-SHA256 signed payloads, a delivery queue with
// exponential-backoff retries + dead-lettering.
//
// SAFETY: JSON-backed; API key secrets are NEVER stored in plaintext (SHA-256 hash + masked
// label only). Webhook delivery is DRY-RUN by default until API_GATEWAY_LIVE_WEBHOOKS=true AND an
// HTTP sender is wired via require('./lib/apiGateway').webhookDispatcher.setSender(fn). Drive
// retries by calling webhookDispatcher.tick() from a scheduler (node-cron already a dep).

const { config, SCOPES } = require('./config');

module.exports = {
 config, SCOPES,
 store: require('./store'),
 keyStore: require('./keyStore'),
 rateLimiter: require('./rateLimiter'),
 authMiddleware: require('./authMiddleware'),
 webhookSubscriptions: require('./webhookSubscriptions'),
 webhookDispatcher: require('./webhookDispatcher'),
 doctor: require('./doctor'),
};
