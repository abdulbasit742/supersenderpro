   'use strict';
   /** Tracks referral records. No raw lead PII stored; no real payouts. */
   const store = require('./store');
   const links = require('./referralLinks');
   const attribution = require('./leadAttribution');
   const resellers = require('./resellerRegistry');
   const STATUSES = ['lead_created', 'demo_requested', 'trial_requested', 'onboarding_started', 'active_trial',
   'converted_preview', 'paid_confirmed_manual', 'rejected', 'archived'];
   function newId() { return 'rfr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
   function list(resellerId) { const all = store.loadReferrals(); return resellerId ? all.filter((r) => r.resellerId ===
   resellerId) : all; }

function create(resellerId, input) {
  const r = resellers.get(resellerId); if (!r) return { ok: false, errors: ['reseller_not_found'] };
  const i = input || {};
  const reseller = resellers.get(resellerId);
  const rate = reseller ? reseller.commissionRate : 0.2;
  const rec = {
    id: newId(), resellerId, leadId: i.leadId || ('lead_' + Date.now().toString(36)), source: i.source || 'partner_link',
    campaignCode: i.campaignCode || null, referralCode: i.referralCode || links.refCode(resellerId),
    status: STATUSES.includes(i.status) ? i.status : 'lead_created', planInterest: i.planInterest || null,
    estimatedValue: 0, commissionPreview: 0, createdAt: new Date().toISOString(),
  };
  const attr = attribution.attribute(rec);
  rec.estimatedValue = attr.estimatedValue;
  rec.commissionPreview = Math.round(attr.estimatedValue * rate);
  const all = store.loadReferrals(); all.push(rec); store.saveReferrals(all);
  store.appendHistory({ kind: 'referral_created', resellerId, id: rec.id });
  return { ok: true, referral: rec };
}
function linkPreview(params) { return links.build(params); }
module.exports = { STATUSES, list, create, linkPreview };
