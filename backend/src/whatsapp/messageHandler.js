const fs = require('fs');
const prisma = require('../services/prisma');
const env = require('../config/env');
const { parseDealerMessage } = require('../dealerIntelligence/dealerParser');
const { createRateEntry } = require('../services/rateService');
const { stockOverview } = require('../services/stockService');
const { cheapestRates } = require('../services/rateService');
const { profitSuggestions } = require('../services/profitEngine');
const { renderTemplate } = require('../utils/templates');
const { normalizePhone } = require('../utils/phone');
const { sendWhatsAppMessage } = require('./baileysClient');
const { giveawayMessage, giveawayImagePath } = require('./messageTemplates');
const { processDealerMessage, castTrustVote } = require('../services/dealerIntelligence');
const { handleAdminCommand } = require('../bot/admin/commands');
const { serviceMenu, captureRequirement } = require('../bot/flows/botService');
const { showAvailability } = require('../bot/flows/availability');
const { maskReference } = require('../security/encryption');
const {
  STATES,
  getConversation,
  setConversation,
  resetConversation,
  isResetCommand,
  isHelpCommand,
  inferNextState
} = require('../bot/stateMachine');

function extractText(msg) {
  const m = msg.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  ).trim();
}

function hasPaymentAttachment(msg) {
  const m = msg.message || {};
  return Boolean(m.imageMessage || m.documentMessage || m.videoMessage);
}

function extractTransactionId(text = '') {
  return String(text || '').match(/(?:transaction(?:\s*id)?|txn|trx|tid|reference(?:\s*no)?|ref)[\s#:.-]*([A-Z0-9-]{5,})/i)?.[1] || '';
}

function senderPhone(msg) {
  const raw = msg.key.participant || msg.key.remoteJid || '';
  return normalizePhone(raw.split('@')[0]);
}

async function getPriceList() {
  const rates = await cheapestRates();
  if (!rates.length) return 'Aaj rates abhi update nahi huay. Thori dair baad try karein.';
  const lines = rates.slice(0, 15).map((r, i) => `${i + 1}. ${r.toolName} ${r.planName} - Rs.${Number(r.buyPrice).toLocaleString()} (${r.dealer.name})`);
  return `📊 *Today's Best AI Tool Rates*\n\n${lines.join('\n')}\n\nOrder ke liye: *order ChatGPT Plus* type karein.`;
}

async function getStockList() {
  const stock = await stockOverview();
  const available = stock.filter(s => s.availableQty > 0).slice(0, 15);
  if (!available.length) return 'Stock abhi empty hai. Admin ko reorder alert bheja gaya hai.';
  return `📦 *Available Stock*\n\n${available.map((s, i) => `${i + 1}. ${s.tool.name} ${s.plan} - ${s.availableQty} available`).join('\n')}`;
}

async function adminCommand(text) {
  if (text.startsWith('!rates')) return getPriceList();
  if (text.startsWith('!stock')) return getStockList();
  if (text.startsWith('!profit')) {
    const rows = await profitSuggestions({ quantity: 1 });
    return `💰 *Best Profit Deals*\n\n${rows.slice(0, 8).map((r, i) => `${i + 1}. ${r.tool} ${r.plan}: buy Rs.${r.buyPrice}, sell Rs.${r.sellPrice} = ${r.marginPct.toFixed(1)}%`).join('\n')}`;
  }
  return '';
}

async function handleDealerGroupMessage(msg, group, text, sessionKey, io) {
  const parsed = parseDealerMessage(text);
  if (!parsed.length) return;
  const phone = senderPhone(msg);
  const dealer = await prisma.dealer.upsert({
    where: { whatsappNumber: phone },
    update: { name: msg.pushName || phone, groupName: group.name },
    create: { name: msg.pushName || phone, whatsappNumber: phone, groupName: group.name, toolsAvailable: parsed.map(p => p.toolName) }
  });
  const saved = [];
  for (const row of parsed) {
    saved.push(await createRateEntry({
      ...row,
      dealerId: dealer.id,
      groupId: group.waGroupId,
      messageId: msg.key.id || null,
      rawText: text,
      source: 'WHATSAPP_GROUP'
    }));
  }
  io?.emit('rates:whatsapp', saved);
  const intel = await processDealerMessage({
    dealerNumber: phone,
    dealerName: msg.pushName || phone,
    groupId: group.waGroupId,
    groupName: group.name,
    messageText: text
  });
  io?.emit('dealer:intelligence', intel);
  if (intel.status === 'unverified') {
    await sendWhatsAppMessage({
      to: group.waGroupId,
      sessionKey,
      message: `@${phone} ne rates bheji hain. Kya yeh trusted hai?\nReply: *TRUSTED YES ${phone}* ya *TRUSTED NO ${phone}*`
    });
  }
}

function isGiveawayIntent(text = '') {
  const lower = String(text || '').toLowerCase();
  return lower === '6'
    || /\b(giveaway|give away|free trial|free plan|moclaw|deepseek v4|deepseek|v4 pro|1000 credits|1,000 credits)\b/i.test(lower);
}

async function sendGiveawayReply(to, sessionKey) {
  const mediaPath = giveawayImagePath();
  const message = giveawayMessage();
  if (mediaPath && fs.existsSync(mediaPath)) {
    try {
      return await sendWhatsAppMessage({ to, message, sessionKey, mediaUrl: mediaPath });
    } catch (error) {
      console.error('[giveaway:mediaSend]', error);
    }
  }
  return sendWhatsAppMessage({ to, message, sessionKey });
}

async function customerReply(text, msg) {
  const lower = text.toLowerCase();
  const txnId = extractTransactionId(text);
  if (txnId || /payment|paid|screenshot|receipt/i.test(lower)) {
    const paymentReply = await handlePaymentEvidence({
      phone: senderPhone(msg),
      name: msg.pushName || 'Customer',
      text,
      txnId,
      hasAttachment: hasPaymentAttachment(msg)
    });
    if (paymentReply) return paymentReply;
  }
  if (isGiveawayIntent(text)) return giveawayMessage();
  if (/^(hi|hello|salam|assalam|menu|start)\b/.test(lower)) {
    return '👋 Assalam o Alaikum! Welcome to AI Tools Store.\n\n1️⃣ Price list\n2️⃣ Stock\n3️⃣ Order AI Tool\n6️⃣ Free Giveaway - DeepSeek V4 Pro 30 days\n\nQuick commands: *price*, *stock*, *giveaway*, *order ChatGPT Plus*';
  }
  if (/\b(bot banana|automation chahiye|website|system|software)\b/i.test(lower)) {
    await captureRequirement({ phone: senderPhone(msg), name: msg.pushName || 'Customer', message: text }).catch(() => null);
    return serviceMenu();
  }
  if (lower.includes('price') || lower.includes('rate')) return getPriceList();
  if (lower === '2' || lower.includes('stock') || lower.includes('available')) return showAvailability();
  if (lower.startsWith('order') || lower.includes('buy')) {
    const wanted = text.replace(/order|buy/ig, '').trim() || 'AI Tool';
    await prisma.customer.upsert({
      where: { whatsapp: senderPhone(msg) },
      update: { name: msg.pushName || 'Customer', notes: `Interested in ${wanted}` },
      create: { name: msg.pushName || 'Customer', whatsapp: senderPhone(msg), notes: `Interested in ${wanted}`, tags: ['hot-lead'] }
    });
    return `✅ Order request noted for *${wanted}*.\n\nPlease send payment screenshot or ask for payment details. Sales team will confirm stock and delivery.`;
  }
  return renderTemplate('Bilkul, main help kar raha hoon 😊\nAap *price*, *stock*, ya *order {{tool}}* likh dein.', { tool: 'ChatGPT Plus' });
}

async function handlePaymentEvidence({ phone, name = 'Customer', text = '', txnId = '', hasAttachment = false }) {
  const order = await prisma.businessOrder.findFirst({
    where: {
      customer: { whatsapp: phone },
      status: { in: ['awaiting_payment', 'awaiting_verification', 'payment_pending'] }
    },
    include: { customer: true, tool: true, plan: true, accountType: true },
    orderBy: { createdAt: 'desc' }
  });
  if (!order) return '';
  const evidence = txnId ? `TXN ${maskReference(txnId)}` : hasAttachment ? 'payment screenshot/media' : 'payment message';
  await prisma.businessOrder.update({
    where: { orderId: order.orderId },
    data: {
      status: 'awaiting_verification',
      paymentScreenshot: hasAttachment ? `whatsapp:${new Date().toISOString()}` : order.paymentScreenshot,
      paymentTxnLast4: txnId ? txnId.slice(-4) : order.paymentTxnLast4,
      notes: [order.notes, `Payment evidence from ${phone}: ${evidence}`].filter(Boolean).join('\n')
    }
  });
  const adminMessage = [
    'Payment evidence received',
    `Order: ${order.orderId}`,
    `Customer: ${name} ${phone}`,
    `Tool: ${order.tool.name} ${order.plan.name}`,
    `Evidence: ${evidence}`,
    `!approve ${order.orderId} | !reject ${order.orderId}`
  ].join('\n');
  await prisma.adminAlert.create({
    data: {
      type: 'payment_evidence',
      title: `Payment evidence ${order.orderId}`,
      message: adminMessage,
      severity: 'warning',
      payload: { orderId: order.orderId, phone, txnId: txnId ? maskReference(txnId) : '', hasAttachment, text: text.slice(0, 500) }
    }
  }).catch(() => null);
  if (env.adminNumber) {
    sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, sessionKey: env.adminSessionId, message: adminMessage })
      .catch((error) => console.error('[paymentEvidence:adminWhatsApp]', error));
  }
  return `✅ Payment received, verifying...\nOrder ID: *${order.orderId}*\nAap ko credentials normally 5 minutes ke andar mil jayengi after confirmation.`;
}

function helpMessage() {
  return [
    '*Help / Madad*',
    '1. *price* ya *rates* - aaj ki price list',
    '2. *available* ya *stock* - real-time availability',
    '3. *order ChatGPT Plus* - order start karein',
    '4. *support* - issue report karein',
    '5. *giveaway* - Moclaw DeepSeek V4 free trial details',
    '',
    'State reset ke liye *menu*, *cancel*, ya *واپس* bhejein.'
  ].join('\n');
}

async function logFailedCommandAttempt({ text, sender, chatId, isGroup }) {
  console.warn('[adminCommand:failedAttempt]', { sender, chatId, isGroup, text });
  await prisma.adminAlert.create({
    data: {
      type: 'failed_command_attempt',
      title: `Failed command attempt from ${sender}`,
      message: text.slice(0, 250),
      severity: 'warning',
      payload: { sender, chatId, isGroup, text }
    }
  }).catch(() => null);
}

async function handleIncomingWhatsApp(msg, sessionKey, io) {
  const text = extractText(msg);
  const remoteJid = msg.key.remoteJid;
  const isGroup = remoteJid?.endsWith('@g.us');
  if (!text && !(hasPaymentAttachment(msg) && !isGroup)) return;

  if (text.startsWith('!')) {
    const reply = await handleAdminCommand(text, senderPhone(msg));
    if (reply) return sendWhatsAppMessage({ to: remoteJid, message: reply, sessionKey });
    await logFailedCommandAttempt({ text, sender: senderPhone(msg), chatId: remoteJid, isGroup });
    return;
  }

  if (isGroup) {
    const group = await prisma.whatsAppGroup.findUnique({ where: { waGroupId: remoteJid } });
    const trustVote = text.match(/^trusted\s+(yes|no)(?:\s+(\+?\d[\d\s-]{6,}))?/i);
    if (trustVote && group?.monitorRates) {
      const targetNumber = trustVote[2] || msg.message?.extendedTextMessage?.contextInfo?.participant?.split('@')[0] || '';
      if (targetNumber) {
        const vote = await castTrustVote({ dealerNumber: targetNumber, voterNumber: senderPhone(msg), vote: trustVote[1] });
        return sendWhatsAppMessage({ to: remoteJid, sessionKey, message: `Trust vote saved. YES: ${vote.yesVotes} | NO: ${vote.noVotes} | Status: ${vote.status}` });
      }
    }
    if (group?.monitorRates || group?.type === 'DEALER') {
      await handleDealerGroupMessage(msg, group, text, sessionKey, io);
    }
    const mentioned = JSON.stringify(msg.message || {}).includes('mentionedJid');
    if (group?.type === 'CUSTOMER' && mentioned) {
      if (isGiveawayIntent(text)) {
        return sendGiveawayReply(remoteJid, sessionKey);
      }
      const reply = await customerReply(text, msg);
      if (reply) return sendWhatsAppMessage({ to: remoteJid, message: reply, sessionKey });
    }
    return;
  }

  const phone = senderPhone(msg);
  const conversation = await getConversation(phone);
  if (isResetCommand(text)) {
    await resetConversation(phone);
    const reply = await customerReply('menu', msg);
    return sendWhatsAppMessage({ to: remoteJid, message: reply, sessionKey });
  }
  if (isHelpCommand(text)) {
    return sendWhatsAppMessage({ to: remoteJid, message: helpMessage(), sessionKey });
  }
  if (isGiveawayIntent(text)) {
    await setConversation(phone, STATES.RATES, { lastText: text, giveaway: 'moclaw-deepseek-v4-free-30-days', lastReplyAt: new Date().toISOString() });
    return sendGiveawayReply(remoteJid, sessionKey);
  }
  const reply = text
    ? await customerReply(text, msg)
    : await handlePaymentEvidence({ phone: senderPhone(msg), name: msg.pushName || 'Customer', hasAttachment: true });
  const nextState = inferNextState(text, conversation.state || STATES.IDLE);
  await setConversation(phone, nextState, { lastText: text, lastReplyAt: new Date().toISOString() });
  if (reply) await sendWhatsAppMessage({ to: remoteJid, message: reply, sessionKey });
}

module.exports = { handleIncomingWhatsApp, extractText };
