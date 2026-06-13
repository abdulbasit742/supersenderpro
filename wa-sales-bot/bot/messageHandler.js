const queries = require('../db/queries');
const { findToolByInput } = require('../config/tools');
const fmt = require('../utils/formatter');
const { showWelcomeMenu } = require('./flows/welcome');
const { showRates, showToolPlans } = require('./flows/rates');
const { showAvailability } = require('./flows/availability');
const { startOrderFlow, handleOrderState, handleTrackOrder } = require('./flows/order');
const { startIssueFlow, handleIssueState } = require('./flows/issue');
const { showSupport, captureBotServiceLead, handleServiceLeadState } = require('./flows/support');
const { handleAdminCommand } = require('./admin/commands');
const { isBotServiceLead } = require('../utils/policyChecker');
const { INTENTS, classifyIntent } = require('./aiAgent/classifier');
const { answerKnowledgeBase, buildEscalationAlert } = require('./aiAgent/knowledgeBase');
const {
  getMessageText,
  getSenderNumber,
  processSellingGroupMessage
} = require('./dealerIntelligence/groupMonitor');

function isGroupJid(jid = '') {
  return String(jid || '').endsWith('@g.us');
}

function messageMentionsSocket(msg, ownJid = '') {
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentions.includes(ownJid);
}

async function collectDealerRates(runtime, msg, groupName) {
  return processSellingGroupMessage(runtime, runtime.getPrimarySocket(), msg, msg.key.remoteJid, groupName);
}

function isWelcomeTrigger(text = '') {
  return /^(hi|hello|salam|assalam|aoa|menu|start)$/i.test(String(text || '').trim());
}

function isAvailabilityTrigger(text = '') {
  return /\b(available|availability|stock|slots)\b/i.test(String(text || ''));
}

function isIssueTrigger(text = '') {
  return /\b(issue|problem|complaint|support|not working|login issue|replacement|warranty)\b/i.test(String(text || ''));
}

async function routeCustomerFlow(runtime, sock, msg, jid, number, text) {
  const lower = String(text || '').toLowerCase();
  const conversation = queries.getConversation(number) || queries.upsertConversation(number, 'IDLE', {});
  const classified = classifyIntent(text);

  if (queries.isScammer(number)) {
    return runtime.sendText(jid, '🚫 Yeh number blocked hai. Support se rabta karein.');
  }

  queries.upsertCustomer(number, msg.pushName || number);

  if (conversation.state === 'AWAITING_SERVICE_DETAILS') {
    return handleServiceLeadState(runtime, jid, number, text, msg.pushName || number);
  }

  if (conversation.state.startsWith('AWAITING_ISSUE')) {
    const handledIssue = await handleIssueState(runtime, text, number, jid, conversation);
    if (handledIssue !== false) return;
  }

  if (conversation.state !== 'IDLE' && !conversation.state.startsWith('AWAITING_ISSUE') && conversation.state !== 'MENU_SHOWN' && conversation.state !== 'VIEWING_RATES' && conversation.state !== 'CHECKING_AVAILABILITY') {
    const handled = await handleOrderState(runtime, msg, text, number, jid, conversation);
    if (handled !== false) return;
  }

  if (isBotServiceLead(text) || classified.intent === INTENTS.BOT_SERVICE) {
    return captureBotServiceLead(runtime, jid, number, text, msg.pushName || number);
  }

  const kbAnswer = answerKnowledgeBase(classified.intent, runtime, classified);
  if (kbAnswer) {
    return runtime.sendText(jid, kbAnswer);
  }

  if (classified.intent === INTENTS.HUMAN_HANDOFF) {
    const adminJid = runtime.adminJid();
    if (adminJid) {
      await runtime.sendText(adminJid, buildEscalationAlert({
        number,
        name: msg.pushName || number,
        message: text,
        classified
      }));
    }
    return runtime.sendText(jid, 'Admin ko alert bhej diya hai. Aap ka message context ke sath forward ho gaya hai.');
  }

  if (lower === '1' || lower.includes('price') || lower.includes('rates') || classified.intent === INTENTS.PRICE_INQUIRY) {
    if (classified.tool) {
      return showToolPlans(runtime, jid, number, text);
    }
    return showRates(runtime, jid, number);
  }

  if (lower === '2' || isAvailabilityTrigger(text) || classified.intent === INTENTS.AVAILABILITY) {
    return showAvailability(runtime, jid, number, text);
  }

  if (lower === '3' || lower.startsWith('buy') || lower.startsWith('order') || classified.intent === INTENTS.ORDER) {
    if (findToolByInput(text)) {
      return showToolPlans(runtime, jid, number, text);
    }
    return startOrderFlow(runtime, jid, number);
  }

  if (lower === '4' || lower.startsWith('track') || /^ord-\d+/i.test(text)) {
    return handleTrackOrder(runtime, jid, number, text.trim().toUpperCase().startsWith('ORD-') ? text.trim().toUpperCase() : '');
  }

  if (lower === '5' || lower === 'help' || isIssueTrigger(text) || classified.intent === INTENTS.ISSUE_REPORT) {
    return startIssueFlow(runtime, jid, number, text);
  }

  if (findToolByInput(text)) {
    if (conversation.state === 'VIEWING_RATES' || conversation.state === 'CHECKING_AVAILABILITY' || conversation.state === 'MENU_SHOWN' || conversation.state === 'IDLE') {
      return showToolPlans(runtime, jid, number, text);
    }
  }

  if (isWelcomeTrigger(text)) {
    return showWelcomeMenu(runtime, jid, number);
  }

  return runtime.sendText(jid, `Bilkul, main help kar raha hoon 🤝\n\n${fmt.welcomeMessage(runtime.config.botName, runtime.config.greeting)}`);
}

async function handleIncomingMessage(runtime, sock, msg) {
  if (!msg?.message || msg.key?.fromMe) return;
  const jid = msg.key.remoteJid;
  const text = getMessageText(msg);
  if (!jid || (!text && !msg.message?.imageMessage && !msg.message?.documentMessage)) return;

  const number = getSenderNumber(msg);
  if (await handleAdminCommand(runtime, jid, number, text)) return;

  if (isGroupJid(jid)) {
    const groupName = runtime.groupNames.get(jid) || jid;
    if ((runtime.config.sellingGroups || runtime.config.dealerGroups || []).includes(jid)) {
      await collectDealerRates(runtime, msg, groupName);
      return;
    }

    if (runtime.config.customerGroups.includes(jid) && messageMentionsSocket(msg, sock.user?.id || '')) {
      await routeCustomerFlow(runtime, sock, msg, jid, number, text);
    }
    return;
  }

  await routeCustomerFlow(runtime, sock, msg, jid, number, text);
}

module.exports = {
  getMessageText,
  getSenderNumber,
  handleIncomingMessage
};
