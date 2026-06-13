const env = require('../config/env');
const { formatGiveawayMessage, giveawayImagePath } = require('../config/giveaways');
const { money, line, accountTypeLabel } = require('../utils/formatter');

function welcomeMessage(name = '') {
  return [
    `السلام علیکم${name ? ` ${name}` : ''} 👋`,
    `*${env.botName || 'AI Tools Store'}* mein welcome.`,
    '',
    '1. View AI Tools & Prices',
    '2. Check Availability',
    '3. Place Order',
    '4. Track My Order',
    '5. Support / Issue',
    '6. Free Giveaway - DeepSeek V4 Pro 30 days',
    '',
    'Bas option number ya keyword reply karein.',
    'Giveaway claim karna ho to *giveaway* ya *free trial* likhein.'
  ].join('\n');
}

function giveawayMessage() {
  return formatGiveawayMessage();
}

function ratesList(rates = []) {
  if (!rates.length) return 'Aaj ke rates abhi update nahi huay. Thori dair baad check karein.';
  return [
    `🤖 *${env.botName || 'AI Tools Store'} — آج کے Rates*`,
    '',
    `📅 ${new Date().toLocaleDateString('en-PK')}`,
    '',
    line(),
    ...rates.map((row) => `${row.icon || '🤖'} ${row.tool || row.toolName || row.toolSlug} ${row.plan || row.planName || ''} → ${money(row.price || row.sellPrice || row.buyPrice)}`),
    line(),
    '',
    '✅ Original keys | ⚡ Instant delivery',
    '📩 Order: Reply here or DM'
  ].join('\n');
}

function availabilityCheck(tool, stock = []) {
  const rows = Array.isArray(stock) ? stock : [stock];
  return [
    line(),
    `🤖 *${tool}*`,
    ...rows.map((row) => {
      const qty = Number(row.quantityAvailable ?? row.slots ?? 0);
      return `${qty > 0 ? '✅' : '❌'} ${accountTypeLabel(row.accountType)} — ${qty > 0 ? `${qty} slots` : 'Out of stock 🔔'}`;
    }),
    line()
  ].join('\n');
}

function orderConfirmation(orderId, tool, price) {
  return `✅ Order created: *${orderId}*\nTool: *${tool}*\nAmount: *${money(price)}*\nPayment details neeche hain.`;
}

function paymentDetails(orderId, amount) {
  return [
    `🧾 Order ID: *${orderId}*`,
    `Amount: *${money(amount)}*`,
    '',
    `JazzCash: ${env.jazzcashNumber || '-'}`,
    `Easypaisa: ${env.easypaisaNumber || '-'}`,
    `${env.bankName || 'Bank'}: ${env.bankAccount || '-'}`,
    '',
    'Payment screenshot yahin send karein.'
  ].join('\n');
}

function deliveryMessage(orderId, credentials, tool) {
  const creds = typeof credentials === 'string'
    ? credentials
    : Object.entries(credentials || {}).map(([key, value]) => `${key}: ${value}`).join('\n');
  return [
    `✅ Delivery for *${orderId}*`,
    `Tool: *${tool}*`,
    '',
    creds,
    '',
    'Please login carefully. Recovery/password settings change na karein unless admin allow kare.',
    'Policy reminder: warranty/non-warranty terms purchase ke mutabiq apply hoti hain.'
  ].join('\n');
}

function warrantyInfo(type) {
  if (type === 'warranty') return '🛡️ Warranty: 1x replacement + max 2x issue resolution. Us ke baad further support close hoti hai.';
  if (type === 'non_warranty') return '⚠️ Non-warranty: purchase ke baad koi claim, replacement ya refund accept nahi hota.';
  return '🔒 Private/shared login: limited slots, no standard warranty. Admin manual support available.';
}

function renewalReminder(tool, daysLeft) {
  return `⏰ Renewal reminder: *${tool}* ${daysLeft} days me expire ho raha hai. Renew karna ho to *renew* reply karein.`;
}

function issueResolved(orderId, resolution) {
  return `✅ Issue resolved for *${orderId}*\nResolution: ${resolution}\nAgar still problem ho to screenshot ke sath reply karein.`;
}

function warrantyExhausted(orderId) {
  return `⚠️ Order *${orderId}*: آپ کی 2 warranty support limit پوری ہو گئی ہے۔ Further claim policy ke mutabiq accept nahi ho sakta.`;
}

function nonWarrantyDecline(orderId) {
  return `⚠️ Order *${orderId}*: یہ Non-warranty account ہے — کوئی claim نہیں ہو سکتا۔`;
}

function buildDailyRateMessage(rows = []) {
  const fallback = [
    { icon: '🤖', tool: 'ChatGPT Plus', price: 2600 },
    { icon: '🧠', tool: 'Claude Pro', price: 2400 },
    { icon: '🎨', tool: 'Midjourney', price: 1700 },
    { icon: '⚡', tool: 'Cursor Pro', price: 2900 },
    { icon: '💎', tool: 'Gemini', price: 2200 }
  ];
  const data = rows.length ? rows : fallback;
  return [
    `🤖 *${env.botName || 'AI Tools Store'} — آج کے Rates*`,
    '',
    `📅 ${new Date().toLocaleDateString('en-PK')}`,
    '',
    line(),
    ...data.slice(0, 12).map((row) => `${row.icon || '🤖'} ${row.tool || `${row.toolSlug || ''} ${row.planSlug || ''}`.trim()} → ${money(row.price || row.sellPrice || row.lowest?.price || 0)}`),
    line(),
    '',
    '✅ Original keys | ⚡ Instant delivery',
    '',
    '📩 Order: Reply here or DM'
  ].join('\n');
}

module.exports = {
  welcomeMessage,
  ratesList,
  availabilityCheck,
  orderConfirmation,
  paymentDetails,
  deliveryMessage,
  warrantyInfo,
  renewalReminder,
  issueResolved,
  warrantyExhausted,
  nonWarrantyDecline,
  buildDailyRateMessage,
  giveawayMessage,
  giveawayImagePath
};
