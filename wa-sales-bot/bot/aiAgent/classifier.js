const { findToolByInput } = require('../../config/tools');

const INTENTS = {
  PRICE_INQUIRY: 'PRICE_INQUIRY',
  AVAILABILITY: 'AVAILABILITY',
  ORDER: 'ORDER',
  ISSUE_REPORT: 'ISSUE_REPORT',
  RENEWAL: 'RENEWAL',
  BOT_SERVICE: 'BOT_SERVICE',
  PAYMENT_METHODS: 'PAYMENT_METHODS',
  ACCOUNT_TYPES: 'ACCOUNT_TYPES',
  WARRANTY_POLICY: 'WARRANTY_POLICY',
  DELIVERY_TIME: 'DELIVERY_TIME',
  ACTIVATION_STEPS: 'ACTIVATION_STEPS',
  HUMAN_HANDOFF: 'HUMAN_HANDOFF',
  UNKNOWN: 'UNKNOWN'
};

function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, words = []) {
  return words.some(word => text.includes(word));
}

function classifyIntent(message = '') {
  const text = normalize(message);
  const tool = findToolByInput(text);

  if (!text) return { intent: INTENTS.UNKNOWN, confidence: 0, tool };

  if (hasAny(text, ['bot banana', 'bot banwana', 'automation', 'whatsapp bot', 'crm banwana', 'panel banwana'])) {
    return { intent: INTENTS.BOT_SERVICE, confidence: 0.96, tool };
  }

  if (hasAny(text, ['admin', 'agent', 'human', 'owner', 'call me', 'urgent'])) {
    return { intent: INTENTS.HUMAN_HANDOFF, confidence: 0.9, tool };
  }

  if (hasAny(text, ['price', 'prices', 'rate', 'rates', 'kitne', 'kitna', 'qeemat', 'قیمت'])) {
    return { intent: INTENTS.PRICE_INQUIRY, confidence: 0.94, tool };
  }

  if (hasAny(text, ['available', 'availability', 'stock', 'slot', 'slots', 'maujood', 'دستیاب'])) {
    return { intent: INTENTS.AVAILABILITY, confidence: 0.94, tool };
  }

  if (hasAny(text, ['buy', 'order', 'purchase', 'chahiye', 'lena', 'kharid', 'خرید']) || /^2$/.test(text)) {
    return { intent: INTENTS.ORDER, confidence: 0.9, tool };
  }

  if (hasAny(text, ['renew', 'renewal', 'expire', 'expiry', 'extend', 'dobara'])) {
    return { intent: INTENTS.RENEWAL, confidence: 0.88, tool };
  }

  if (hasAny(text, ['issue', 'problem', 'not working', 'login nahi', 'password', 'otp', 'disabled', 'locked', 'replacement', 'refund', 'complaint'])) {
    return { intent: INTENTS.ISSUE_REPORT, confidence: 0.92, tool };
  }

  if (hasAny(text, ['payment', 'pay', 'jazzcash', 'easypaisa', 'bank', 'account number'])) {
    return { intent: INTENTS.PAYMENT_METHODS, confidence: 0.9, tool };
  }

  if (hasAny(text, ['claim', 'guarantee', 'replace', 'replacement policy', 'support limit'])) {
    return { intent: INTENTS.WARRANTY_POLICY, confidence: 0.86, tool };
  }

  if (hasAny(text, ['warranty policy', 'warranty limit', 'support policy'])) {
    return { intent: INTENTS.WARRANTY_POLICY, confidence: 0.88, tool };
  }

  if (hasAny(text, ['private', 'warranty', 'non warranty', 'non-warranty', 'types', 'difference', 'shared login'])) {
    return { intent: INTENTS.ACCOUNT_TYPES, confidence: 0.86, tool };
  }

  if (hasAny(text, ['delivery', 'deliver', 'kab milega', 'kitni dair', 'time'])) {
    return { intent: INTENTS.DELIVERY_TIME, confidence: 0.84, tool };
  }

  if (hasAny(text, ['activate', 'activation', 'setup', 'use kaise', 'login kaise'])) {
    return { intent: INTENTS.ACTIVATION_STEPS, confidence: 0.84, tool };
  }

  if (tool) {
    return { intent: INTENTS.PRICE_INQUIRY, confidence: 0.7, tool };
  }

  return { intent: INTENTS.UNKNOWN, confidence: 0.25, tool: null };
}

module.exports = {
  INTENTS,
  classifyIntent
};
