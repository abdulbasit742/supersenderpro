  'use strict';


  /** Loyalty Center — loyalty customer model + tiers. */

  const store = require('./store');
  const { maskPhone, maskEmail, safeName } = require('./redactor');


  const TIERS = ['bronze_preview', 'silver_preview', 'gold_preview', 'platinum_preview', 'vip_preview'];


  // tier thresholds by lifetime spend (PKR, preview).
  const TIER_THRESHOLDS = [
    { tier: 'vip_preview', minSpend: 200000 },
       { tier: 'platinum_preview', minSpend: 100000 },
       { tier: 'gold_preview', minSpend: 40000 },
       { tier: 'silver_preview', minSpend: 10000 },
       { tier: 'bronze_preview', minSpend: 0 },
  ];

  function tierForSpend(spend) {
    const s = Number(spend) || 0;
       for (const t of TIER_THRESHOLDS) if (s >= t.minSpend) return t.tier;
       return 'bronze_preview';
  }


  function build(input) {
    const i = input || {};


       const now = new Date().toISOString();
       const spend = Math.max(0, Number(i.lifetimeSpend) || 0);
       return {
         id: store.genId('loy'),
         customerId: String(i.customerId || store.genId('cust')),
         customerNameSafe: safeName(i.customerName || i.customerId),
         phoneMasked: i.phone ? maskPhone(i.phone) : null,
         emailMasked: i.email ? maskEmail(i.email) : null,
         tier: tierForSpend(spend),
         pointsBalancePreview: Math.max(0, Number(i.points) || 0),
         storeCreditPreview: Math.max(0, Number(i.storeCredit) || 0),
         lifetimeSpendPreview: spend,
         repeatOrderCountPreview: Math.max(0, Number(i.repeatOrders) || 0),
         referralCodePreview: null,
         referralCountPreview: Math.max(0, Number(i.referrals) || 0),
         riskLevel: 'low',
         dryRun: true,
         createdAt: now,
         updatedAt: now,
       };
  }


  module.exports = { TIERS, TIER_THRESHOLDS, tierForSpend, build };
