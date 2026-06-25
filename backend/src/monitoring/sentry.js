// Sentry monitoring - graceful fallback if not configured
let Sentry = null;

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) { console.log('[Sentry] SENTRY_DSN not set - monitoring disabled'); return false; }
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn, environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      release: process.env.npm_package_version || '1.0.0',
      beforeSend(event) {
        if (event.request?.headers?.authorization) event.request.headers.authorization = '[REDACTED]';
        return event;
      }
    });
    console.log('[Sentry] Monitoring initialized');
    return true;
  } catch (err) { console.warn('[Sentry] Failed:', err.message); return false; }
}

function captureError(err, context = {}) {
  if (Sentry) Sentry.withScope(scope => { Object.entries(context).forEach(([k,v]) => scope.setExtra(k,v)); Sentry.captureException(err); });
}

function sentryRequestHandler() {
  if (Sentry) return Sentry.Handlers.requestHandler();
  return (req, res, next) => next();
}

function sentryErrorHandler() {
  if (Sentry) return Sentry.Handlers.errorHandler();
  return (err, req, res, next) => next(err);
}

module.exports = { initSentry, captureError, sentryRequestHandler, sentryErrorHandler };
