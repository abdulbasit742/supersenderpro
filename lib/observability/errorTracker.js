'use strict';
/**
 * lib/observability/errorTracker.js - one capture() entry point for errors.
 * If SENTRY_DSN is set and @sentry/node is installed, forwards there. Otherwise keeps
 * an in-memory ring buffer (last N) and logs - so you always have *something* in dev,
 * and it never throws if Sentry isn't configured.
 */
const logger = require('./logger');

let Sentry = null;
const DSN = process.env.SENTRY_DSN || '';
if (DSN) {
  try { Sentry = require('@sentry/node'); Sentry.init({ dsn: DSN, tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0) }); logger.info({ msg: 'sentry initialized' }); }
  catch { Sentry = null; logger.warn({ msg: 'SENTRY_DSN set but @sentry/node not installed - using local buffer' }); }
}

const MAX = Number(process.env.ERROR_BUFFER_SIZE || 100);
const buffer = [];

function capture(err, context = {}) {
  const entry = {
    at: new Date().toISOString(),
    message: err && err.message ? err.message : String(err),
    stack: err && err.stack ? String(err.stack).split('\n').slice(0, 5).join('\n') : undefined,
    context,
  };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  logger.error({ msg: 'captured_error', err: entry.message, context });
  if (Sentry) { try { Sentry.captureException(err, { extra: context }); } catch {} }
  return entry;
}

const recent = (limit = 25) => buffer.slice(0, limit);
const stats = () => ({ buffered: buffer.length, max: MAX, sentry: !!Sentry });

module.exports = { capture, recent, stats, sentryEnabled: () => !!Sentry };
