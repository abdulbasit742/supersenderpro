'use strict';
/**
 * lib/security/headers.js - sensible security response headers without adding a dependency.
 * (If you later `npm i helmet`, you can swap this out; this keeps us safe in the meantime.)
 *
 * securityHeaders(): HSTS, nosniff, frame deny, referrer policy, a conservative CSP, and
 * strips X-Powered-By. All values overridable via env so it won't break an embedded UI.
 * bodySizeGuard(): rejects absurdly large JSON bodies early (defense-in-depth alongside any
 * express.json limit), returning 413.
 */
const CSP = process.env.SECURITY_CSP || "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'";
const ENABLE_CSP = process.env.SECURITY_CSP_ENABLED !== 'false';
const ENABLE_HSTS = process.env.SECURITY_HSTS_ENABLED !== 'false';
const FRAME = process.env.SECURITY_FRAME_OPTIONS || 'DENY';
const MAX_BODY_BYTES = Number(process.env.SECURITY_MAX_BODY_BYTES || 2 * 1024 * 1024); // 2MB

function securityHeaders() {
  return (req, res, next) => {
    try {
      res.removeHeader && res.removeHeader('X-Powered-By');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-Frame-Options', FRAME);
      res.set('Referrer-Policy', 'no-referrer');
      res.set('X-XSS-Protection', '0'); // modern browsers: rely on CSP, disable legacy auditor
      if (ENABLE_HSTS) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
      if (ENABLE_CSP) res.set('Content-Security-Policy', CSP);
    } catch {}
    next();
  };
}

// Early body-size rejection based on Content-Length (cheap; complements stream limits).
function bodySizeGuard(maxBytes = MAX_BODY_BYTES) {
  return (req, res, next) => {
    const len = Number(req.headers['content-length'] || 0);
    if (len && len > maxBytes) return res.status(413).json({ success: false, error: 'payload too large', maxBytes });
    next();
  };
}

module.exports = { securityHeaders, bodySizeGuard, MAX_BODY_BYTES };
