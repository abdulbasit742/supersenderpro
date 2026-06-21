'use strict';
/** Attributes a lead to a reseller by referral code. Estimates value; no raw lead PII. */
function attribute(referral, plans) {
  const planValue = { Starter: 999, Pro: 2499, Business: 4999, Agency: 9999 };
  const estimatedValue = referral.planInterest ? (planValue[referral.planInterest] || 0) : 0;
  return { resellerId: referral.resellerId, leadId: referral.leadId, estimatedValue, currency: 'PKR' };
}
module.exports = { attribute };
