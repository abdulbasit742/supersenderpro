'use strict';
/** WhatsApp admin command hooks (existing bot; no new bot). Concise Urdu/English. */
const resellers = require('./resellerRegistry');
const referrals = require('./referralTracker');
const commission = require('./commissionPreview');
const clientPreview = require('./clientPreview');
const assets = require('./assetLibrary');
const handlers = {
  '!resellers': () => {
    const r = resellers.list();
    return r.length ? r.map((x) => `${x.id}: ${x.companyName || x.name} (${x.partnerTier}/${x.status})`).join('\n') : 'Koi reseller nahi.';
  },
  '!reseller': (a) => {
    const r = resellers.get(a[0]);
    return r ? `${r.companyName || r.name}\nTier: ${r.partnerTier}\nStatus: ${r.status}\nLeads: ${(r.referredLeads || []).length}` : 'Reseller nahi mila.';
  },
  '!partnerleads': () => {
    const all = referrals.list();
    return `Total referrals: ${all.length}. Converted preview: ${all.filter((x) => x.status === 'converted_preview').length}`;
  },
  '!commissions': () => {
    const r = resellers.list();
    return r.map((x) => `${x.companyName || x.name}: ~${commission.preview(x.id).commissionAmountPreview} PKR (preview)`).join('\n') || 'Koi data nahi.';
  },
  '!resellerclients': (a) => {
    const c = clientPreview.list(a[0]);
    return c.ok ? (c.clients.map((x) => `${x.businessName} (${x.onboardingStatus})`).join('\n') || 'Koi client nahi.') : 'Reseller nahi mila.';
  },
  '!partnerdraft': () => assets.generate('sales_pitch', 'roman_urdu').draft,
  '!resellerdoctor': () => { const r = resellers.list(); return `Resellers ${r.length}, payouts: preview-only, white-label: off.`; },
};
function handle(cmd, args) { const fn = handlers[cmd]; return fn ? fn(args || []) : null; }
module.exports = { handlers, handle };
