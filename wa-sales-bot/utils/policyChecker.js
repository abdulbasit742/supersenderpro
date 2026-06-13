const { ACCOUNT_TYPE_CATALOG } = require('../config/tools');
const { checkWarrantyEligibility } = require('./warrantyChecker');

function getAccountTypeMeta(typeName = '') {
  return ACCOUNT_TYPE_CATALOG.find(item => item.name === String(typeName || '').toLowerCase()) || null;
}

function getPolicyWarning(typeName = '') {
  const type = getAccountTypeMeta(typeName);
  if (!type) return 'Policy unavailable.';
  if (type.name === 'warranty') {
    return 'Warranty policy: 1 replacement + max 2 issue resolutions. Us ke baad further support nahi hogi.';
  }
  if (type.name === 'non_warranty') {
    return 'NON-WARRANTY: purchase ke baad koi claim, refund, ya replacement accept nahi hoga.';
  }
  return 'Private account: shared login, limited-time Rs 999, aur limited slots only.';
}

function getDeliveryReminder(typeName = '') {
  const type = getAccountTypeMeta(typeName);
  if (!type) return '';
  if (type.name === 'warranty') {
    return 'Yaad rahe: is account par 1 replacement aur max 2 issue resolutions milengi.';
  }
  if (type.name === 'non_warranty') {
    return 'Reminder: non-warranty account par purchase ke baad claims accept nahi hote.';
  }
  return 'Private shared login account hai. Access ko apni taraf se safe rakhein.';
}

function evaluateIssueSupport(order = {}) {
  const type = getAccountTypeMeta(order.type_name);
  const warranty = checkWarrantyEligibility(order);
  if (!type) {
    return {
      allowed: false,
      escalate: true,
      message: 'Order type clear nahi hai. Admin ko alert kiya ja raha hai.'
    };
  }

  if (type.name === 'non_warranty') {
    return {
      allowed: false,
      escalate: false,
      message: warranty.message
    };
  }

  if (type.name === 'warranty') {
    if (!warranty.canResolveIssue) {
      return {
        allowed: false,
        escalate: false,
        message: warranty.message
      };
    }
    return {
      allowed: true,
      escalate: false,
      remainingIssues: warranty.issueResolutionsRemaining,
      message: warranty.message
    };
  }

  return {
    allowed: false,
    escalate: false,
    message: warranty.message
  };
}

function analyzeIssueText(text = '') {
  const lower = String(text || '').toLowerCase();
  const simpleKeywords = [
    { key: 'login', reply: 'Login issue: pehle logout/login try karein, cache clear karein, aur correct email/password confirm karein.' },
    { key: 'password', reply: 'Password issue: delivery message ke credentials dobara check karein. Agar mismatch ho to admin confirm karega.' },
    { key: 'otp', reply: 'OTP / verification issue: thori dair baad dubara try karein aur VPN off rakhein.' },
    { key: 'not working', reply: 'Basic fix: logout/login, browser change, aur 5 minute baad retry karein.' },
    { key: 'locked', reply: 'Account locked lag raha hai. Is case ko admin review ki zarurat ho sakti hai.' }
  ];

  const matched = simpleKeywords.find(item => lower.includes(item.key));
  const complex = /\b(replace|replacement|ban|banned|disabled|locked|fraud|refund|chargeback|suspended)\b/i.test(lower);

  return {
    simpleReply: matched?.reply || 'Basic check: internet stable rakhein, credentials dobara verify karein, aur same device par retry karein.',
    needsAdmin: complex || !matched,
    keyword: matched?.key || ''
  };
}

function isBotServiceLead(text = '') {
  return /\b(bot service|bot banwana|whatsapp bot|automation service|custom bot|panel banwana|crm banwana)\b/i.test(String(text || ''));
}

module.exports = {
  getAccountTypeMeta,
  getPolicyWarning,
  getDeliveryReminder,
  evaluateIssueSupport,
  analyzeIssueText,
  isBotServiceLead
};
