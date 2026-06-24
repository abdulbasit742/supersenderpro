'use strict';

/**
 * lib/ecommerce/http.js
 * Tiny HTTP wrapper used by every connector. axios is already a project
 * dependency. The wrapper is injectable so unit tests can pass a stub and
 * run fully offline (no live store / no network).
 *
 * Signature: http({ method, url, headers, params, data, auth, timeout })
 *   -> resolves { status, data }  (throws on network error)
 */

let axios = null;
try { axios = require('axios'); } catch (_) { /* tests inject their own */ }

async function defaultHttp(opts) {
  if (!axios) throw new Error('axios not available; inject an http client');
  const res = await axios({
    method: opts.method || 'GET',
    url: opts.url,
    headers: opts.headers || {},
    params: opts.params || undefined,
    data: opts.data || undefined,
    auth: opts.auth || undefined,
    timeout: opts.timeout || 20000,
    validateStatus: () => true, // we inspect status ourselves
  });
  return { status: res.status, data: res.data };
}

module.exports = { defaultHttp };
