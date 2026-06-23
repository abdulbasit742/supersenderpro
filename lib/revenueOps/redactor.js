// lib/revenueOps/redactor.js — read-only redaction + shared safety flags for Revenue Ops.
// Never returns full PII, secrets, raw env values, or stack traces. Exact revenue values are banded/masked.
'use strict';

function str(v) { return (v === undefined || v === null) ? '' : String(v); }

function safetyFlags(extra) {
  return Object.assign({
    ok: true,
    dryRun: true,
    previewOnly: true,
    readOnly: true,
    liveActionsEnabled: false,
    externalCallsEnabled: false,
    liveSend: false,
    liveAiCall: false,
    liveDbMutation: false,
    leadMutationEnabled: false,
    opportunityMutationEnabled: false,
    pipelineMutationEnabled: false,
    repAssignmentEnabled: false,
    invoiceMutationEnabled: false,
    paymentMutationEnabled: false,
    piiMasked: true,
    secretsExposed: false,
  }, extra || {});
}

function safeError(message) {
  return {
    ok: false, dryRun: true, previewOnly: true, readOnly: true,
    error: str(message) || 'revenue_ops_preview_error',
    details: 'Revenue operations preview failed safely.',
    secretsExposed: false,
  };
}

function safeText(value) {
  let s = str(value).replace(/[\u0000-\u001f\u007f]/g, ' ');
  if (s.length > 200) s = s.slice(0, 197) + '...';
  return s;
}
function truncateText(value, n) {
  const s = str(value);
  const max = Number(n) || 120;
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

function maskPhone(phone) {
  const digits = str(phone).replace(/[^\d+]/g, '');
  if (!digits) return 'not_provided';
  if (digits.length <= 7) return digits.slice(0, 2) + '****';
  return digits.slice(0, 3) + '*'.repeat(Math.max(2, digits.length - 7)) + digits.slice(-4);
}
function maskEmail(email) {
  const s = str(email);
  const m = s.match(/^([^@\s]+)@(.+)$/);
  if (!m) return s ? 'masked' : 'not_provided';
  return m[1].slice(0, 2) + '***@' + m[2];
}
function maskName(name) {
  const s = str(name).trim();
  if (!s) return 'not_provided';
  const parts = s.split(/\s+/);
  return parts.map((p) => p.slice(0, 1) + '***').join(' ');
}
function maskCompany(company) {
  const s = str(company).trim();
  if (!s) return 'not_provided';
  return s.slice(0, 2) + '*** (masked)';
}
function maskAddress(address) {
  const s = str(address).trim();
  if (!s) return 'not_provided';
  // genericize: keep only a region-ish hint
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  const region = parts.length ? parts[parts.length - 1] : 'region';
  return 'masked address, ' + safeText(region);
}
function maskToken(token) { const s = str(token); return s ? s.slice(0, 6) + '_****' : 'not_configured'; }
function maskSecret(value) { const s = str(value); return s ? s.slice(0, 6) + '_****' : 'not_configured'; }
function maskRef(ref) {
  const s = str(ref);
  if (!s) return 'not_provided';
  const i = s.lastIndexOf('_');
  return i > 0 ? s.slice(0, i) + '_****' : s.slice(0, 4) + '****';
}

// Band an amount so an exact (possibly real) revenue value is never returned.
function amountBand(value) {
  const n = Number(value) || 0;
  if (n <= 0) return { band: 'unknown', label: 'unknown band' };
  if (n < 50000) return { band: 'low', label: 'low band (< Rs. 50K)' };
  if (n < 250000) return { band: 'medium', label: 'medium band (Rs. 50K–250K)' };
  if (n < 1000000) return { band: 'high', label: 'high band (Rs. 250K–1M)' };
  return { band: 'enterprise', label: 'enterprise band (Rs. 1M+)' };
}
function maskAmount(value) { return amountBand(value).label; }

function sanitizeLeadInput(lead) {
  const l = lead || {};
  return {
    maskedName: maskName(l.name || l.customerName),
    maskedPhone: maskPhone(l.phone),
    maskedEmail: maskEmail(l.email),
    source: safeText(l.source || 'unknown'),
    stage: safeText(l.stage || 'New Lead'),
  };
}
function sanitizeOpportunityInput(opp) {
  const o = opp || {};
  return {
    opportunityIdPreview: maskRef(o.id || 'opp_unknown'),
    stage: safeText(o.stage || 'New Lead'),
    valueBand: safeText(o.valueBand || amountBand(o.value).band),
    lastContactDays: Number(o.lastContactDays || 0),
    replies: Number(o.replies || 0),
  };
}
function sanitizeRevenueRecord(rec) {
  const r = rec || {};
  return {
    maskedCustomerName: maskName(r.customerName || r.name),
    maskedPhone: maskPhone(r.phone),
    maskedEmail: maskEmail(r.email),
    maskedCompany: maskCompany(r.company),
    valueBand: amountBand(r.value).band,
    amountMasked: maskAmount(r.value),
    stage: safeText(r.stage || 'New Lead'),
  };
}
function sanitizeError(err) {
  const msg = (err && err.message) ? err.message : str(err);
  return { message: safeText(String(msg).split('\n')[0]), stackExposed: false };
}

function hasLeak(obj) {
  let s; try { s = JSON.stringify(obj); } catch (_) { return false; }
  if (!s) return false;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(s)) return true;
  if (/\bsk-[A-Za-z0-9]{20,}\b/.test(s)) return true;
  if (/"stack"\s*:/.test(s)) return true;
  if (/\b\d{11,}\b/.test(s)) return true; // unmasked long phone-like number
  return false;
}

module.exports = {
  safetyFlags, safeError, safeText, truncateText,
  maskPhone, maskEmail, maskName, maskCompany, maskAddress, maskAmount, maskToken, maskSecret, maskRef,
  amountBand, sanitizeLeadInput, sanitizeOpportunityInput, sanitizeRevenueRecord, sanitizeError, hasLeak,
};
