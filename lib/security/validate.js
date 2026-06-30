'use strict';
/**
 * lib/security/validate.js - minimal, dependency-free request validation.
 * (Zod/Joi are great; this keeps input validation available without adding a dep, and matches
 * the repo's 'works out of the box' convention. Swap to zod later if desired.)
 *
 * Schema shape: { field: { required?, type?, min?, max?, enum?, email?, pattern?, default? } }
 *   type: 'string' | 'number' | 'boolean' | 'array' | 'object'
 * validate(schema, obj) -> { ok, errors[], value }  (value has coercions + defaults applied)
 * validateBody(schema) -> Express middleware; on failure responds 400 with field errors.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function coerce(type, v) {
  if (type === 'number') { const n = Number(v); return Number.isFinite(n) ? n : v; }
  if (type === 'boolean') { if (typeof v === 'boolean') return v; if (v === 'true') return true; if (v === 'false') return false; return v; }
  return v;
}

function typeOf(v) { return Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v); }

function validate(schema, obj = {}) {
  const errors = [];
  const value = Object.assign({}, obj);
  for (const [field, rule] of Object.entries(schema || {})) {
    let v = obj[field];
    if ((v === undefined || v === null || v === '') && rule.default !== undefined) { v = rule.default; value[field] = v; }
    if (v === undefined || v === null || v === '') {
      if (rule.required) errors.push({ field, error: 'required' });
      continue;
    }
    if (rule.type) { v = coerce(rule.type, v); value[field] = v; const t = typeOf(v); if (t !== rule.type) { errors.push({ field, error: 'expected ' + rule.type + ', got ' + t }); continue; } }
    if (rule.email && !EMAIL_RE.test(String(v))) errors.push({ field, error: 'invalid email' });
    if (rule.enum && !rule.enum.includes(v)) errors.push({ field, error: 'must be one of ' + rule.enum.join(', ') });
    if (rule.min !== undefined) { const n = typeof v === 'number' ? v : String(v).length; if (n < rule.min) errors.push({ field, error: 'min ' + rule.min }); }
    if (rule.max !== undefined) { const n = typeof v === 'number' ? v : String(v).length; if (n > rule.max) errors.push({ field, error: 'max ' + rule.max }); }
    if (rule.pattern && !(new RegExp(rule.pattern)).test(String(v))) errors.push({ field, error: 'invalid format' });
  }
  return { ok: errors.length === 0, errors, value };
}

function validateBody(schema) {
  return (req, res, next) => {
    const r = validate(schema, req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: 'validation failed', fields: r.errors });
    req.body = r.value; // normalized (coercions + defaults)
    next();
  };
}

// Ready-made schemas for the subsystems we shipped (opt-in per route).
const schemas = {
  signup: { email: { required: true, type: 'string', email: true }, password: { required: true, type: 'string', min: 8 }, name: { type: 'string', max: 120 } },
  login: { email: { required: true, type: 'string', email: true }, password: { required: true, type: 'string', min: 1 } },
  checkout: { planId: { required: true, type: 'string', enum: ['free', 'starter', 'pro'] } },
  deal: { title: { type: 'string', max: 200 }, value: { type: 'number', min: 0 }, stage: { type: 'string', enum: ['NEW_LEAD', 'QUALIFIED', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON', 'LOST'] } },
};

module.exports = { validate, validateBody, schemas, EMAIL_RE };
