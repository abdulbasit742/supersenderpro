const config = require('./config');
const db = require('./db');
const { extractRatesFromMessage, parseOrder, normalizeTool, detectPlan } = require('./parser');
const fmt = require('./formatters');

const orderSessions = new Map();

function getMessageText(msg) {
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

function getSenderNumber(msg) {
  const raw = msg.key.participant || msg.key.remoteJid || '';
  return config.normalizePhone(raw.split('@')[0]);
}

function isGroupJid(jid = '') {
  return String(jid || '').endsWith('@g.us');
}

function isAdminNumber(number = '') {
  return config.adminNumbers.includes(config.normalizePhone(number));
}

function isConfiguredDealerGroup(groupId) {
  if (config.dealerGroups.has(groupId)) return true;
  const setting = db.getGroupSetting(groupId);
  return Boolean(setting?.monitor_rates || setting?.group_type === 'dealer');
}

function isConfiguredCustomerGroup(groupId) {
  if (config.customerGroups.has(groupId)) return true;
  const setting = db.getGroupSetting(groupId);
  return Boolean(setting?.broadcast_enabled || setting?.group_type === 'customer');
}

function messageMentionsBot(msg, ownJid = '') {
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentions.includes(ownJid);
}

async function reply(sock, jid, text) {
  return sock.sendMessage(jid, { text });
}

async function processDealerRateMessage(sock, msg, groupName = '') {
  const text = getMessageText(msg);
  const parsed = extractRatesFromMessage(text);
  if (!parsed.length) return [];

  const dealerNumber = getSenderNumber(msg);
  if (db.isScammer(dealerNumber)) return [];

  const dealer = db.upsertDealer({
    number: dealerNumber,
    name: msg.pushName || dealerNumber,
    groupId: msg.key.remoteJid,
    groupName
  });

  const saved = [];
  for (const row of parsed) {
    db.saveRate({
      dealer,
      dealerNumber,
      groupId: msg.key.remoteJid,
      groupName,
      toolName: row.toolName,
      planName: row.planName,
      buyPrice: row.buyPrice,
      rawMessage: text,
      messageId: msg.key.id
    });
    saved.push(row);
  }

  console.log(`📥 Saved ${saved.length} rates from ${dealerNumber}`);
  return saved;
}

async function handleCustomer(sock, msg) {
  const text = getMessageText(msg);
  const lower = text.toLowerCase();
  const jid = msg.key.remoteJid;
  const number = getSenderNumber(msg);
  const customer = db.upsertCustomer({ number, name: msg.pushName || number });

  const pending = orderSessions.get(number);
  if (pending) {
    if (pending.step === 'name') {
      pending.customerName = text.trim();
      pending.step = 'qty';
      orderSessions.set(number, pending);
      return reply(sock, jid, `✅ Naam mil gaya: *${pending.customerName}*\n\nAb quantity bhejein (1, 2, 3...)`);
    }
    if (pending.step === 'qty') {
      const qty = Math.max(1, Number.parseInt(text, 10) || 1);
      const cheapest = db.getCheapestRates(72).find(r => r.tool_name === pending.toolName && (pending.planName === 'Default' || r.plan_name.includes(pending.planName)));
      const sellPrice = cheapest ? Math.ceil(Number(cheapest.buy_price) * 1.25) : 0;
      const created = db.createOrder({
        customer,
        number,
        name: pending.customerName || customer.name,
        toolName: pending.toolName,
        planName: pending.planName,
        qty,
        sellPrice
      });
      db.adjustStockDelta(pending.toolName, pending.planName, -qty);
      orderSessions.delete(number);
      await reply(sock, jid, fmt.orderCreated(created));
      const low = db.getLowStockRows();
      if (low.length) {
        const adminJid = config.adminNumbers[0] ? `${config.adminNumbers[0]}@s.whatsapp.net` : null;
        if (adminJid) {
          await sock.sendMessage(adminJid, { text: fmt.lowStockAlert(low) }).catch(() => {});
        }
      }
      return;
    }
  }

  if (/^(hi|hello|salam|assalam|menu|start)\b/.test(lower)) {
    return reply(sock, jid, fmt.welcomeMenu(customer.name));
  }
  if (lower === 'help' || lower.includes('madad')) {
    return reply(sock, jid, fmt.helpMenu(isAdminNumber(number)));
  }
  if (lower.includes('price') || lower.includes('rate')) {
    return reply(sock, jid, fmt.priceList(db.getCheapestRates(24)));
  }
  if (lower.includes('stock') || lower.includes('available')) {
    return reply(sock, jid, fmt.stockList(db.getStock()));
  }

  const order = parseOrder(text);
  if (order) {
    orderSessions.set(number, { step: 'name', toolName: order.toolName, planName: order.planName });
    return reply(sock, jid, `🛒 *Order flow started*

Tool: *${order.toolName} ${order.planName}*

Apna *name* bhejein.`);
  }

  return reply(sock, jid, `Bilkul, main help kar raha hoon 😊\nAap *price*, *stock*, ya *order chatgpt* likh dein.`);
}

async function handleAdminCommand(sock, msg, sessionManager) {
  const text = getMessageText(msg);
  const jid = msg.key.remoteJid;
  const number = getSenderNumber(msg);
  if (!isAdminNumber(number) || !text.startsWith('!')) return false;

  const [cmd, ...args] = text.trim().split(/\s+/);
  if (cmd === '!rates') {
    await reply(sock, jid, fmt.adminRates(db.getTodayRates()));
    return true;
  }
  if (cmd === '!profit') {
    const [tool, buy, sell] = args;
    await reply(sock, jid, fmt.profitResult(tool, Number(buy), Number(sell)));
    return true;
  }
  if (cmd === '!stock') {
    const tool = normalizeTool(args[0] || '') || args[0] || 'AI Tool';
    const qty = Number(args[args.length - 1] || 0);
    const plan = detectPlan(args.join(' '));
    const row = db.updateStock(tool, plan, qty);
    const lowNotice = Number(row.qty) < Number(row.threshold)
      ? `\n\n⚠️ Low stock warning: ${row.qty} left`
      : '';
    await reply(sock, jid, `✅ Stock updated: *${row.tool_name} ${row.plan_name}* = ${row.qty}${lowNotice}`);
    return true;
  }
  if (cmd === '!broadcast') {
    const message = args.join(' ');
    if (!message) {
      await reply(sock, jid, 'Usage: !broadcast Your message here');
      return true;
    }
    const result = await sessionManager.broadcastToCustomerGroups(message);
    await reply(sock, jid, `📢 Broadcast complete.\nSent: ${result.sent.length}\nFailed: ${result.failed.length}`);
    return true;
  }
  if (cmd === '!scam') {
    const target = config.normalizePhone(args[0] || '');
    const notes = args.slice(1).join(' ') || 'Flagged by admin';
    if (!target) {
      await reply(sock, jid, 'Usage: !scam 923001234567 reason');
      return true;
    }
    db.flagScammer(target, notes);
    await reply(sock, jid, `🚫 Scammer flagged: ${target}\n${notes}`);
    return true;
  }
  if (cmd === '!top') {
    const summary = db.getDailySalesSummary();
    await reply(sock, jid, fmt.salesSummary(summary));
    return true;
  }
  await reply(sock, jid, fmt.helpMenu(true));
  return true;
}

async function handleIncomingMessage(sock, msg, sessionManager) {
  if (!msg.message || msg.key.fromMe) return;
  const text = getMessageText(msg);
  if (!text) return;

  const jid = msg.key.remoteJid;
  const isGroup = isGroupJid(jid);

  if (await handleAdminCommand(sock, msg, sessionManager)) return;

  if (isGroup) {
    const metadata = await sock.groupMetadata(jid).catch(() => ({ subject: jid }));
    const setting = db.getGroupSetting(jid);
    if (!setting) {
      const fromEnvDealer = config.dealerGroups.has(jid);
      const fromEnvCustomer = config.customerGroups.has(jid);
      db.saveGroupSetting({
        groupId: jid,
        groupName: metadata.subject,
        groupType: fromEnvDealer ? 'dealer' : 'customer',
        monitorRates: fromEnvDealer,
        broadcastEnabled: fromEnvCustomer
      });
    }

    if (isConfiguredDealerGroup(jid)) {
      await processDealerRateMessage(sock, msg, metadata.subject);
      return;
    }

    if (isConfiguredCustomerGroup(jid) && messageMentionsBot(msg, sock.user?.id || '')) {
      await handleCustomer(sock, msg);
      return;
    }
    return;
  }

  await handleCustomer(sock, msg);
}

module.exports = {
  getMessageText,
  getSenderNumber,
  handleIncomingMessage,
  processDealerRateMessage,
  handleCustomer,
  handleAdminCommand
};
