'use strict';
/** Profile shape + defaults for resellers. Safe defaults; PII masked via store. */
const privacyGuard = require('./privacyGuard');
const PARTNER_TIERS = ['referral_partner', 'agency_partner', 'reseller', 'white_label_reseller', 'enterprise_partner',
'custom'];
const STATUSES = ['pending_review', 'active', 'paused', 'suspended', 'archived'];
const TIER_COMMISSION = { referral_partner: 0.15, agency_partner: 0.20, reseller: 0.25, white_label_reseller: 0.30,
enterprise_partner: 0.35, custom: 0.20 };
function newId() { return 'rsl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function defaults(i) {
  const now = new Date().toISOString();
    const tier = PARTNER_TIERS.includes(i.partnerTier) ? i.partnerTier : 'referral_partner';
    return {
      id: i.id || newId(), name: privacyGuard.maskValue(i.name || 'Unnamed Partner'), companyName: i.companyName || '',
      emailMasked: privacyGuard.maskValue(i.email || i.emailMasked || ''), phoneMasked: privacyGuard.maskPhone(i.phone ||
i.phoneMasked || ''),
    country: i.country || 'PK', city: i.city || '', status: STATUSES.includes(i.status) ? i.status : 'pending_review',
      partnerTier: tier, assignedTenants: i.assignedTenants || [], referredLeads: i.referredLeads || [],
      commissionRate: i.commissionRate != null ? i.commissionRate : TIER_COMMISSION[tier],
      payoutStatus: 'preview_only', whiteLabelEnabled: false, portalAccessStatus: 'pending',
      dryRun: true, createdAt: now, updatedAt: now,
    };
}
module.exports = { PARTNER_TIERS, STATUSES, TIER_COMMISSION, defaults, newId };
