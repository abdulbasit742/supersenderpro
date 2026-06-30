'use strict';

// Broadcast Campaign Composer config. All overridable via env, all safe defaults.
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v == null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }

const config = {
  // Dry-run is the default. NOTHING is actually sent unless explicitly disabled
  // AND a real send adapter is wired by the host app.
  dryRun: bool(process.env.CAMPAIGN_DRY_RUN, true),

  // Throttle: messages per minute per tenant (protects WhatsApp number health).
  ratePerMinute: num(process.env.CAMPAIGN_RATE_PER_MINUTE, 20),
  batchSize: num(process.env.CAMPAIGN_BATCH_SIZE, 50),

  // How many copy variants to generate for A/B/n testing.
  maxVariants: num(process.env.CAMPAIGN_MAX_VARIANTS, 3),

  // Quiet hours (local tenant time, 24h). No sends scheduled inside this window.
  quietStartHour: num(process.env.CAMPAIGN_QUIET_START, 22),
  quietEndHour: num(process.env.CAMPAIGN_QUIET_END, 8),

  // Currency / locale defaults for PK market.
  currency: process.env.CAMPAIGN_CURRENCY || 'PKR',
  defaultTimezone: process.env.CAMPAIGN_TZ || 'Asia/Karachi',

  // LLM is optional. When false (or model unreachable) we use deterministic templates.
  useLLM: bool(process.env.CAMPAIGN_USE_LLM, true),
};

module.exports = { config };
