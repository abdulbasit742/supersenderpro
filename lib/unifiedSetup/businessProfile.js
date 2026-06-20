// lib/unifiedSetup/businessProfile.js — Normalized business profile model + CRUD.
// Stores only masked owner phone/email. Repo-relative store.

const { config, readJSON, writeJSON, appendHistory } = require('./store');
const presets = require('./presets');
const { maskPhone, maskEmail } = require('./privacy');

function defaults() {
  return {
    businessId: `biz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessName: '',
    businessType: 'custom',
    country: '',
    timezone: '',
    currency: '',
    language: 'roman_urdu',
    ownerName: '',
    ownerPhoneMasked: '',
    ownerEmailMasked: '',
    businessChannels: [],
    ecommercePlatforms: [],
    paymentMethods: [],
    socialPlatforms: [],
    automationGoals: [],
    complianceMode: 'consent_first',
    launchMode: 'dry_run',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function _load() { return readJSON(config.paths.store, {}); }
function _save(d) { return writeJSON(config.paths.store, d); }

function get() {
  const d = _load();
  return d.profile || null;
}

function upsert(input = {}) {
  const d = _load();
  const cur = d.profile || defaults();
  const type = presets.BUSINESS_TYPES.includes(input.businessType) ? input.businessType : cur.businessType;
  const next = {
    ...cur,
    ...input,
    businessType: type,
    // force masking of sensitive owner fields
    ownerPhoneMasked: input.ownerPhone ? maskPhone(input.ownerPhone) : (input.ownerPhoneMasked || cur.ownerPhoneMasked),
    ownerEmailMasked: input.ownerEmail ? maskEmail(input.ownerEmail) : (input.ownerEmailMasked || cur.ownerEmailMasked),
    updatedAt: new Date().toISOString(),
  };
  // never persist raw owner phone/email
  delete next.ownerPhone;
  delete next.ownerEmail;
  d.profile = next;
  _save(d);
  appendHistory('profile_upserted', { businessType: next.businessType });
  return next;
}

module.exports = { defaults, get, upsert };
