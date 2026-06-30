'use strict';
/** lib/observability/index.js - namespace for logging/tracing/error-tracking. */
const logger = require('./logger');
const tracing = require('./tracing');
const errorTracker = require('./errorTracker');

module.exports = { logger, errorTracker, requestTracing: tracing.requestTracing, errorHandler: tracing.errorHandler };
