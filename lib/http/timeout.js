'use strict';
/**
 * lib/http/timeout.js - per-request timeout + slow-request logging.
 * If a handler doesn't respond within the budget, send 503 (once) so clients fail fast instead
 * of hanging on a wedged downstream. Streaming responses (SSE, websockets, file downloads) are
 * skipped via opts.skip or by detecting an already-flushed header.
 */
let logger = console; try { logger = require('../observability/logger'); } catch {}

function requestTimeout(ms = Number(process.env.REQUEST_TIMEOUT_MS || 30000), opts = {}) {
  const skip = opts.skip || ((req) => /\/(stream|sse|events|socket|download|metrics)(\/|$)/i.test(req.path || req.url || ''));
  return (req, res, next) => {
    if (skip(req)) return next();
    let done = false;
    const finish = () => { done = true; clearTimeout(timer); };
    res.on('finish', finish); res.on('close', finish);
    const timer = setTimeout(() => {
      if (done || res.headersSent) return;
      try {
        (logger.warn ? logger.warn({ msg: 'request_timeout', path: req.originalUrl || req.url, ms }) : logger.warn('request_timeout', req.url));
        res.status(503).json({ success: false, error: 'request timed out', timeoutMs: ms });
      } catch {}
    }, ms);
    if (timer.unref) timer.unref();
    next();
  };
}

function slowRequestLog(thresholdMs = Number(process.env.SLOW_REQUEST_MS || 1000)) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durMs = Number(process.hrtime.bigint() - start) / 1e6;
      if (durMs >= thresholdMs) {
        (logger.warn ? logger.warn({ msg: 'slow_request', path: req.originalUrl || req.url, method: req.method, status: res.statusCode, durMs: Math.round(durMs) }) : logger.warn('slow_request', req.url, Math.round(durMs)));
      }
    });
    next();
  };
}

module.exports = { requestTimeout, slowRequestLog };
