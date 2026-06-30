'use strict';
/**
 * lib/notify/index.js - one place to send a notification over a channel.
 * Channels: 'email' | 'whatsapp' | 'webhook'. Unifies the ad-hoc senders used by admin alerts,
 * billing dunning, and password reset so callers don't each reinvent delivery.
 *
 * Safe: NOTIFY_DRY_RUN=true (default) prepares without sending; providers also self-report when
 * unconfigured. Never throws - returns a result object.
 */
const providers = require('./providers');
let logger = console; try { logger = require('../observability/logger'); } catch {}

const DRY_RUN = String(process.env.NOTIFY_DRY_RUN || 'true') === 'true';
const registry = { email: providers.email, whatsapp: providers.whatsapp, webhook: providers.webhook };

function register(channel, provider) { registry[channel] = provider; }

async function send(channel, to, message, opts = {}) {
  const p = registry[channel];
  if (!p) return { ok: false, error: 'unknown channel: ' + channel };
  const dryRun = opts.dryRun !== undefined ? opts.dryRun : DRY_RUN;
  if (dryRun) {
    (logger.info ? logger.info({ msg: 'notify_dry_run', channel, to }) : logger.log('[notify] dry-run', channel, to));
    return { ok: true, dryRun: true, channel, to, message };
  }
  try { const r = await p.send(to, message, opts); return Object.assign({ channel }, r); }
  catch (e) { return { ok: false, channel, to, error: e.message }; }
}

// Send the same message across multiple channels (best-effort, collects results).
async function broadcast(channels, to, message, opts = {}) {
  const results = {};
  for (const ch of channels) results[ch] = await send(ch, to, message, opts);
  return results;
}

function status() {
  return { dryRun: DRY_RUN, channels: Object.fromEntries(Object.entries(registry).map(([k, v]) => [k, { configured: v.detect ? !!v.detect() : false }])) };
}

module.exports = { send, broadcast, register, status, registry };
