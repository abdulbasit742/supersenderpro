'use strict';
const R = require('./redactor');
const PRICING_TIERS = ['standard_preview','silver_preview','gold_preview','platinum_preview'];
const DEALER_STATUS = ['active_preview','on_hold_preview','pending_review_preview','inactive_preview'];
function normalizeTier(v) { const t = String(v || '').toLowerCase(); return PRICING_TIERS.find((x) => x.startsWith(t)) || 'standard_preview'; }
function normalizeStatus(v) { const s = String(v || '').toLowerCase(); return DEALER_STATUS.find((x) => x.startsWith(s)) || 'pending_review_preview'; }
function toDealerPreview(raw) { const d = raw || {}; return { idMasked: R.maskRef(d.id || d.dealerId), nameMasked: (R.maskName ? R.maskName(d.name || d.businessName) : R.safeName(d.name || d.businessName)), contactMasked: { phone: R.maskPhone(d.phone), email: R.maskEmail(d.email), address: d.address ? '••• (masked)' : null }, taxMasked: R.maskRef(d.taxId || d.ntn), cnicMasked: R.maskRef(d.cnic), bankMasked: R.maskRef(d.bankAccount), pricingTierPreview: normalizeTier(d.pricingTier || d.tier), statusPreview: normalizeStatus(d.status), creditLimitPreview: d.creditLimit ? 'masked' : null, outstandingPreview: d.outstanding ? 'masked' : null, isAlsoReseller: Boolean(d.resellerId || d.isReseller), resellerRefMasked: d.resellerId ? R.maskRef(d.resellerId) : null }; }
function isValidDealerId(v) { return typeof v === 'string' ? v.trim().length > 0 : (v != null && String(v).length > 0); }
module.exports = { PRICING_TIERS, DEALER_STATUS, normalizeTier, normalizeStatus, toDealerPreview, isValidDealerId };
