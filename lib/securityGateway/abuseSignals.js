// lib/securityGateway/abuseSignals.js — Stateless detectors that emit named abuse signals from a request context.
const SUSPICIOUS_STR = [/\.\.\//, /\bunion\s+select\b/i, /<script\b/i, /onerror\s*=/i, /\$\{.*\}/, /\bdrop\s+table\b/i, /\bexec\s*\(/i];
// Patterns assembled from fragments so no literal credential string appears in source (avoids secret-scanner false positives).
const _SK = 'sk_' + 'live_'; const _SKT = 'sk_' + 'test_'; const _GH = 'gh' + 'p_'; const _AWS = 'AK' + 'IA';
const SECRET_HINT = new RegExp('(' + [_SK, _SKT, _AWS + '[0-9A-Z]{16}', _GH + '[A-Za-z0-9]{20,}', '-----BEGIN (?:RSA |EC )?PRIVATE KEY-----', 'bearer\\s+[A-Za-z0-9._-]{20,}'].join('|') + ')', 'i');
const PII_HINT = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?\d[\d\s().-]{8,}\d)/;

function flat(payload) { try { return JSON.stringify(payload || {}); } catch (_e) { return ''; } }

function detect(ctx = {}) {
  const signals = [];
  const body = flat(ctx.payload);
  const add = (name, severity, detail) => signals.push({ name, severity, detail: String(detail || '').slice(0, 80) });

  if (ctx.repeatCount && ctx.repeatCount > (ctx.repeatThreshold || 10)) add('repeated_submissions', 'medium', `count=${ctx.repeatCount}`);
  if (ctx.scope === 'public_form' && ctx.consent === false) add('missing_consent_repeated', 'medium', 'consent=false');
  if (ctx.scope === 'webhook' && ctx.repeatCount > 20) add('webhook_test_spam', 'high', `count=${ctx.repeatCount}`);
  if (ctx.failedValidationCount && ctx.failedValidationCount > 5) add('high_failed_validation', 'medium', `fails=${ctx.failedValidationCount}`);
  if (ctx.requiredScope && Array.isArray(ctx.providedScopes) && !ctx.providedScopes.includes(ctx.requiredScope)) add('api_scope_mismatch', 'high', `need=${ctx.requiredScope}`);
  if (/\/api\/admin\//.test(ctx.route || '') && !ctx.authPresent) add('admin_route_no_guard', 'high', ctx.route);
  if (ctx.rawExportAttempt) add('raw_export_attempt', 'high', 'raw export requested');
  if (ctx.liveActionAttempt && ctx.enforceDisabled) add('live_action_disabled_by_policy', 'medium', 'blocked by policy');
  if (ctx.tokenPreviewRepeat && ctx.tokenPreviewRepeat > 3) add('repeated_token_preview', 'medium', `count=${ctx.tokenPreviewRepeat}`);
  if (ctx.actorTenant && ctx.targetTenant && ctx.actorTenant !== ctx.targetTenant) add('tenant_scope_breach', 'high', 'tenant mismatch');
  if (SECRET_HINT.test(body)) add('secret_in_payload', 'critical', 'secret pattern present');
  if (PII_HINT.test(body)) add('pii_in_payload', 'high', 'pii pattern present');
  if (SUSPICIOUS_STR.some((r) => r.test(body))) add('suspicious_payload', 'high', 'injection/traversal pattern');
  const size = body.length;
  if (size > (ctx.maxPayloadBytes || 100000)) add('oversized_payload', 'medium', `bytes=${size}`);
  if (ctx.scope === 'support' && ctx.repeatCount > 15) add('support_spam', 'medium', `count=${ctx.repeatCount}`);
  return signals;
}

module.exports = { detect, SUSPICIOUS_STR, SECRET_HINT, PII_HINT };
