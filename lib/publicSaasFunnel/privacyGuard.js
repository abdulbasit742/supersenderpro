// lib/publicSaasFunnel/privacyGuard.js
// PII masking + leak detection for the public funnel.
// Prefers the existing Compliance Center privacy helpers; falls back to local logic.

let cc = null;
try { cc = require('../complianceCenter/privacy'); } catch { cc = null; }

function maskEmail(email) {
  if (!email) return '';
  const s = String(email).trim();
  const at = s.indexOf('@');
  if (at <= 0) return maskGeneric(s);
  const user = s.slice(0, at);
  const domain = s.slice(at + 1);
  const u = user.length <= 2 ? `${user[0] || ''}*` : `${user.slice(0, 2)}***`;
  const dotparts = domain.split('.');
  const tld = dotparts.length > 1 ? dotparts.pop() : '';
  const dname = dotparts.join('.');
  const d = dname.length <= 1 ? '*' : `${dname[0]}***`;
  return tld ? `${u}@${d}.${tld}` : `${u}@${d}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `****${digits.slice(-3)}`;
}

function maskName(name) {
  if (!name) return '';
  const s = String(name).trim();
  if (cc && typeof cc.maskSubject === 'function') {
    // keep first name visible-ish but use compliance masker for safety
  }
  const parts = s.split(/\s+/);
  return parts.map((p) => (p.length <= 2 ? p : `${p[0]}${'*'.repeat(Math.min(4, p.length - 1))}`)).join(' ');
}

function maskGeneric(v) {
  if (!v) return '';
  const s = String(v);
  return s.length <= 4 ? `${s[0] || ''}***` : `${s.slice(0, 2)}***${s.slice(-1)}`;
}

// Detect raw PII / secret leaks in a string or object (defensive check for responses).
function hasLeak(value) {
  if (value === undefined || value === null) return false;
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // strip safe ISO timestamps and our own ids before scanning
  text = text.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '')
             .replace(/\b(?:hist|lead|demo|trial|onb|tnt)_\d{6,}_[a-z0-9]+/gi, '');
  const emailRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  const phoneRe = /(?:\+?\d[\s-]?){7,}/;
  const secretRe = /(api[_-]?key|secret|token|password|bearer|authorization)\s*[:=]/i;
  if (emailRe.test(text)) return true;
  if (phoneRe.test(text)) return true;
  if (secretRe.test(text)) return true;
  if (cc && typeof cc.hasLeak === 'function' && cc.hasLeak(text)) return true;
  return false;
}

// Produce a public-safe view of a lead (admin=false hides everything sensitive).
function publicLeadView(lead) {
  if (!lead) return null;
  return {
    id: lead.id,
    businessType: lead.businessType || null,
    interestedPlan: lead.interestedPlan || null,
    sourcePage: lead.sourcePage || null,
    status: lead.status || null,
    score: lead.score || 0,
    createdAt: lead.createdAt || null,
  };
}

// Admin view: still masked contact (never raw email/phone unless export explicitly allowed elsewhere).
function adminLeadView(lead) {
  if (!lead) return null;
  return {
    id: lead.id,
    nameSafe: lead.nameSafe || null,
    businessName: lead.businessName || null,
    businessType: lead.businessType || null,
    emailMasked: lead.emailMasked || null,
    phoneMasked: lead.phoneMasked || null,
    country: lead.country || null,
    city: lead.city || null,
    interestedPlan: lead.interestedPlan || null,
    interestedModules: lead.interestedModules || [],
    sourcePage: lead.sourcePage || null,
    messagePreview: lead.messagePreview || null,
    consentMarketing: !!lead.consentMarketing,
    consentContact: !!lead.consentContact,
    status: lead.status || null,
    score: lead.score || 0,
    grade: lead.grade || null,
    assignedTo: lead.assignedTo || null,
    followupDraft: lead.followupDraft || null,
    createdAt: lead.createdAt || null,
    updatedAt: lead.updatedAt || null,
  };
}

module.exports = { maskEmail, maskPhone, maskName, maskGeneric, hasLeak, publicLeadView, adminLeadView, usingComplianceCenter: !!cc };
