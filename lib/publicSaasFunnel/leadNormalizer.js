// lib/publicSaasFunnel/leadNormalizer.js
// Normalize + mask raw inbound lead payloads into the safe internal lead shape.
// Raw email/phone are masked immediately; full values are never persisted by the funnel.

const privacy = require('./privacyGuard');

function clampStr(v, max = 280) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/\s+/g, ' ').trim().slice(0, max);
}
function clampArr(v, max = 30) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, max).map((x) => clampStr(x, 60)).filter(Boolean);
}

// Accepts a raw public payload, returns a masked, validated lead-draft object.
function normalize(raw = {}, sourcePage = 'unknown') {
  const name = clampStr(raw.name || raw.fullName || raw.nameSafe, 80);
  const email = clampStr(raw.email, 120);
  const phone = clampStr(raw.phone || raw.whatsapp, 40);
  const message = clampStr(raw.message || raw.notes, 500);

  return {
    nameSafe: privacy.maskName(name),
    businessName: clampStr(raw.businessName, 120),
    businessType: clampStr(raw.businessType || 'custom', 60),
    emailMasked: privacy.maskEmail(email),
    phoneMasked: privacy.maskPhone(phone),
    country: clampStr(raw.country, 60),
    city: clampStr(raw.city, 60),
    interestedPlan: clampStr(raw.interestedPlan || raw.plan, 40),
    interestedModules: clampArr(raw.interestedModules || raw.modules),
    sourcePage: clampStr(sourcePage, 60),
    messagePreview: message ? `${message.slice(0, 140)}${message.length > 140 ? '…' : ''}` : '',
    consentMarketing: raw.consentMarketing === true || raw.consentMarketing === 'true',
    consentContact: raw.consentContact === true || raw.consentContact === 'true'
      || raw.consent === true || raw.consent === 'true',
  };
}

// Basic validation for public POST. Returns { valid, errors }.
function validate(raw = {}) {
  const errors = [];
  const hasContact = (raw.email && String(raw.email).includes('@')) || (raw.phone && String(raw.phone).replace(/\D/g, '').length >= 7);
  if (!hasContact) errors.push('contact_required'); // need email or phone
  if (!raw.businessType) errors.push('business_type_required');
  return { valid: errors.length === 0, errors };
}

module.exports = { normalize, validate };
