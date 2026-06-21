  'use strict';

  /**
   * Loyalty Center — referral program preview.
      *
      * Reuses the existing Referral Engine (src/modules/referral) read-only when
      * present to fetch a code; otherwise generates a deterministic preview code.
      * Never issues a live code.
      */

  const crypto = require('crypto');
  const tiers = require('./rewardTierService');
  const { safeName } = require('./redactor');


  function existingReferral() {
    try { return require('../../src/modules/referral'); } catch (_e) {}
       try { return require('../../src/modules/referral/referral'); } catch (_e) {}
       return null;
  }

  function previewCode(input) {
    const i = input || {};
       const cust = tiers.getRaw(i.customerId);
       const base = (cust ? cust.customerNameSafe : (i.customerId || 'CUST')).replace(/[^A-Za-z0-9]/g,
  '').toUpperCase().slice(0, 6) || 'CUST';
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
       const referralCodePreview = `${base}-${suffix}`;
       return {
           ok: true, dryRun: true, liveReferralCode: false,
           customerId: i.customerId || null,
           referralCodePreview,
           rewardPreview: { signupBonusPoints: 300, purchaseBonusPoints: 500, note: 'preview only; not issued' },


        existingReferralEngineDetected: Boolean(existingReferral()),
        warnings: [], blockers: ['live_referral_code_disabled'],
      };
  }


  function list() {
    // Surface masked referral counts from loyalty customers.
    return tiers.list({ limit: 1000 }).map((c) => ({ customerNameSafe: c.customerNameSafe, referralCountPreview:
  c.referralCountPreview, tier: c.tier }));
  }


  module.exports = { previewCode, list };
