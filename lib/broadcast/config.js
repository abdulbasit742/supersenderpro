// lib/broadcast/config.js — Broadcast Campaigns department config
// All knobs env-overridable. Draft-safe by default: nothing is actually sent
// until a notifier is wired AND BROADCAST_LIVE=true.
'use strict';

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v == null) return d; return String(v).toLowerCase() === 'true'; }

const config = {
  // Master switch. When false (default) every send is recorded as a DRAFT and
  // no outbound notifier is invoked. Flip to true only once a real notifier is wired.
  live: bool(process.env.BROADCAST_LIVE, false),

  // Max recipients allowed in a single broadcast (safety rail vs accidental mega-blast).
  maxRecipients: num(process.env.BROADCAST_MAX_RECIPIENTS, 5000),

  // Throttle hint (messages/min) surfaced to the sender layer. Advisory only here.
  ratePerMinute: num(process.env.BROADCAST_RATE_PER_MIN, 60),

  // Honor consent/opt-out dept (#38) when present.
  enforceConsent: bool(process.env.BROADCAST_ENFORCE_CONSENT, true),

  // Honor sender-health / anti-ban dept (#30) when present.
  enforceSenderHealth: bool(process.env.BROADCAST_ENFORCE_HEALTH, true),

  // Mask PII in any API response / log line.
  maskPII: bool(process.env.BROADCAST_MASK_PII, true),

  // Where JSON state lives (relative to repo root /data).
  dataDir: process.env.BROADCAST_DATA_DIR || 'data/broadcast',
};

module.exports = { config };
