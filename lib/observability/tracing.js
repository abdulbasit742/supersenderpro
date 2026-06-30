'use strict';
/**
 * lib/observability/tracing.js - request tracing + access logging middleware.
 * Assigns/propagates X-Request-Id, binds a child logger to req.log, logs completion
 * with status + duration, and routes thrown errors through the error tracker.
 */
const crypto = require('crypto');
const logger = require('./logger');
const errorTracker = require('./errorTracker');

function requestTracing() {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    const requestId = incoming || crypto.randomBytes(8).toString('hex');
    const start = process.hrtime.bigint();
    req.requestId = requestId;
    req.log = logger.child({ requestId, tenantId: req.tenantId });
    res.set('X-Request-Id', requestId);
    res.on('finish', () => {
      const durMs = Number(process.hrtime.bigint() - start) / 1e6;
      const line = { msg: 'http', method: req.method, path: req.originalUrl || req.url, status: res.statusCode, durMs: Math.round(durMs), requestId };
      if (res.statusCode >= 500) logger.error(line);
      else if (res.statusCode >= 400) logger.warn(line);
      else logger.info(line);
    });
    next();
  };
}

// Express error handler (4-arg). Mount last.
function errorHandler() {
  return (err, req, res, next) => {
    errorTracker.capture(err, { requestId: req && req.requestId, path: req && (req.originalUrl || req.url), tenantId: req && req.tenantId });
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ success: false, error: 'internal error', requestId: req && req.requestId });
  };
}

module.exports = { requestTracing, errorHandler };
