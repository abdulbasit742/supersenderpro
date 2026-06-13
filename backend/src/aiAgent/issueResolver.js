const { checkEligibility } = require('../utils/warrantyChecker');

async function resolveAutomatically(orderIdOrOrder, issueType = '') {
  const warranty = await checkEligibility(orderIdOrOrder);
  if (!warranty.canClaim) return { handled: true, reply: warranty.message, warranty };
  const type = String(issueType || '').toUpperCase();
  if (type.includes('ACCOUNT_NOT_WORKING') || type.includes('LOGIN')) {
    return {
      handled: false,
      reply: 'Pehle ye steps try karein: browser cache clear karein, same credentials dobara login karein, VPN off karein, aur exact error screenshot bhejein.',
      warranty
    };
  }
  if (type.includes('PASSWORD_WRONG')) {
    return {
      handled: false,
      reply: 'Password issue ke liye screenshot aur provided email share karein. Admin reset/replacement verify karega.',
      warranty
    };
  }
  if (type.includes('SUBSCRIPTION_EXPIRED')) {
    return {
      handled: false,
      reply: 'Expiry premature lag rahi hai to order ID ke sath screenshot bhejein. Warranty eligibility check ho gayi hai.',
      warranty
    };
  }
  return null;
}

module.exports = { resolveAutomatically };
