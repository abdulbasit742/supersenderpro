'use strict';
/**
 * lib/http/errors.js - one consistent error envelope + a JSON 404 for unknown API routes.
 * Today handlers return varied shapes and unknown /api paths fall through to an HTML 404.
 * This standardizes both without changing existing handlers (opt-in helpers + a tail 404).
 *
 * Envelope: { success:false, error:<message>, code:<machine_code>, requestId?:<id> }
 */
class ApiError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

const make = (status, code) => (message) => new ApiError(status, code, message);
const errors = {
  badRequest: make(400, 'bad_request'),
  unauthorized: make(401, 'unauthorized'),
  forbidden: make(403, 'forbidden'),
  notFound: make(404, 'not_found'),
  conflict: make(409, 'conflict'),
  tooMany: make(429, 'rate_limited'),
  internal: make(500, 'internal_error'),
};

function sendError(res, err, req) {
  const status = (err && err.status) || 500;
  const code = (err && err.code) || (status === 500 ? 'internal_error' : 'error');
  const body = { success: false, error: err && err.message ? err.message : String(err || 'error'), code };
  if (req && req.requestId) body.requestId = req.requestId;
  return res.status(status).json(body);
}

// 404 for unmatched API routes (mount AFTER all /api routers, BEFORE the error handler).
function notFoundHandler(prefix = '/api') {
  return (req, res, next) => {
    if (!req.path || !req.path.startsWith(prefix)) return next(); // let non-API (static/UI) 404 normally
    return sendError(res, new ApiError(404, 'not_found', 'route not found: ' + req.method + ' ' + req.path), req);
  };
}

module.exports = { ApiError, errors, sendError, notFoundHandler };
