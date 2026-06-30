'use strict';
/** lib/redis/index.js - namespace for the Redis-backed shared-state helpers. */
const client = require('./client');
const lock = require('./lock');
const rateLimit = require('./rateLimit');
const cache = require('./cache');

module.exports = { client, lock, rateLimit, cache, healthz: client.healthz, available: client.available };
