// lib/groupCommerce/moderation.js - Link Protection & Content Shield Rules
const groupRegistry = require('./groupRegistry');

const LINK_MODERATION_DRY_RUN = process.env.GROUP_COMMERCE_LINK_MODERATION_DRY_RUN !== 'false';

function checkMessage(groupId, messageText) {
  const text = String(messageText || '');
  const group = groupRegistry.getGroup(groupId);

  const result = {
    isTriggered: false,
    reason: null,
    action: 'allow',
    dryRun: LINK_MODERATION_DRY_RUN,
    warningMessage: ''
  };

  if (!group || !group.moderationMode) {
    return result;
  }

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matchesLink = urlRegex.test(text);

  const isAuthorizedLink = text.includes('wa.me') || text.includes('chat.whatsapp.com');

  if (matchesLink && !isAuthorizedLink) {
    result.isTriggered = true;
    result.reason = 'Banned link detected';
    result.action = LINK_MODERATION_DRY_RUN ? 'flag' : 'warn';
    result.warningMessage = `⚠️ [DRY-RUN] External links are restricted in this group. Please avoid posting untrusted links.`;
    return result;
  }

  const paymentScamRegex = /(easypaisa|jazzcash|bank transfer|paid rs\.\d+|sent \d+ rs|payment proof|screenshot sent)/i;
  const matchesPayment = paymentScamRegex.test(text);
  const mentionsSku = /\b(SKU-[A-Z0-9\-]+)\b/i.test(text);

  if (matchesPayment && !mentionsSku && text.toLowerCase().includes('verify')) {
    result.isTriggered = true;
    result.reason = 'Scam-like payment verification claim';
    result.action = 'flag';
    result.warningMessage = `⚠️ [DRY-RUN] Payment claims without verifying SKU references must be checked manually by Group Admins.`;
    return result;
  }

  if (text.length > 500 && text.split('\n').length > 10) {
    result.isTriggered = true;
    result.reason = 'Suspected spam/wall-of-text';
    result.action = 'warn';
    result.warningMessage = `⚠️ [DRY-RUN] Please avoid posting overly long walls of text. It blocks other traders.`;
    return result;
  }

  return result;
}

module.exports = {
  checkMessage
};
