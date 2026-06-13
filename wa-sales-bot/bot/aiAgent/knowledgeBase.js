const { INTENTS } = require('./classifier');

function paymentMethods(config = {}) {
  return `💳 *Payment Methods*
━━━━━━━━━━━━━━━━━━━━

JazzCash: *${config.jazzCash || 'Not configured'}*
Easypaisa: *${config.easyPaisa || 'Not configured'}*
Bank: *${config.bankAccount || 'Not configured'}*

Order place karne ke baad screenshot isi chat mein bhej dein.`;
}

function accountTypes() {
  return `📦 *Account Types*
━━━━━━━━━━━━━━━━━━━━

1. *Private Account* — Rs 999 limited time, shared login, limited slots. No warranty or replacement.

2. *Warranty Account* — 1x replacement + max 2x issue resolution. Limit complete hone ke baad further support close.

3. *Non-Warranty Account* — cheapest option. Purchase ke baad koi claim, refund, ya replacement accept nahi hota.`;
}

function warrantyPolicy() {
  return `🛡️ *Warranty Policy*
━━━━━━━━━━━━━━━━━━━━

Warranty accounts mein:
• 1 replacement allowed
• Max 2 issue resolutions allowed
• Us ke baad warranty support limit complete ho jati hai

Non-warranty aur private accounts par replacement warranty nahi hoti.`;
}

function deliveryTime() {
  return `⏱️ *Delivery Time*
━━━━━━━━━━━━━━━━━━━━

Payment screenshot ke baad admin verification hoti hai. Approve hote hi bot automatically credentials isi WhatsApp chat mein deliver karta hai.`;
}

function activationSteps(toolName = 'AI tool') {
  return `🔐 *Activation Steps*
━━━━━━━━━━━━━━━━━━━━

1. Delivery message mein diye gaye credentials copy karein
2. Official ${toolName} website/app open karein
3. Email/password ya key se login karein
4. VPN/proxy off rakhein agar login issue aaye
5. Issue aaye to *issue* likh kar order ID bhej dein`;
}

function renewalHelp() {
  return `🔁 *Renewal*
━━━━━━━━━━━━━━━━━━━━

Renewal ke liye apna latest Order ID bhej dein ya jis tool ko renew karna hai us ka naam likhein. Bot current price aur availability show kar dega.`;
}

function answerKnowledgeBase(intent, runtime, classified = {}) {
  switch (intent) {
    case INTENTS.PAYMENT_METHODS:
      return paymentMethods(runtime.config);
    case INTENTS.ACCOUNT_TYPES:
      return accountTypes();
    case INTENTS.WARRANTY_POLICY:
      return warrantyPolicy();
    case INTENTS.DELIVERY_TIME:
      return deliveryTime();
    case INTENTS.ACTIVATION_STEPS:
      return activationSteps(classified.tool?.name || 'AI tool');
    case INTENTS.RENEWAL:
      return renewalHelp();
    default:
      return '';
  }
}

function buildEscalationAlert({ number, name, message, classified }) {
  return `⚠️ *ADMIN ALERT*
━━━━━━━━━━━━━━━━━━━━

Customer: *${name || 'Unknown'}*
Number: *${number}*
Intent: *${classified.intent}*
Confidence: *${Math.round((classified.confidence || 0) * 100)}%*
Tool: *${classified.tool?.name || 'N/A'}*

Message:
"${message}"
━━━━━━━━━━━━━━━━━━━━`;
}

module.exports = {
  answerKnowledgeBase,
  buildEscalationAlert
};
