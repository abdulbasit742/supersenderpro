const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');
const { findToolByInput, getToolOptionsText, TOOL_CATALOG, findAccountTypeByInput } = require('../../config/tools');
const { getPolicyWarning } = require('../../utils/policyChecker');
const n8nBridge = require('../../lib/n8nBridge');

function isNumericChoice(text = '') {
  return /^\d+$/.test(String(text || '').trim());
}

function selectPlanFromRows(rows = [], text = '') {
  const plans = [];
  const map = new Map();
  rows.forEach(row => {
    const key = row.plan_id;
    if (!map.has(key)) {
      map.set(key, row);
      plans.push(row);
    }
  });

  if (isNumericChoice(text)) {
    return plans[Number(text) - 1] || null;
  }

  const direct = plans.find(row =>
    String(row.plan_name).toLowerCase() === String(text || '').toLowerCase() ||
    String(text || '').toLowerCase().includes(String(row.plan_name || '').toLowerCase()) ||
    String(text || '').toLowerCase().includes(String(row.plan_slug || '').toLowerCase())
  );
  return direct || null;
}

function selectAccountTypeFromRows(rows = [], text = '') {
  if (isNumericChoice(text)) {
    return rows[Number(text) - 1] || null;
  }
  const accountType = findAccountTypeByInput(text);
  if (!accountType) return null;
  return rows.find(row => row.type_name === accountType.name) || null;
}

async function startOrderFlow(runtime, jid, number) {
  queries.upsertConversation(number, 'SELECTING_TOOL', {});
  return runtime.sendText(jid, `🛒 *Place Order*\n${fmt.divider()}\n\nAvailable tools:\n${getToolOptionsText()}\n\nTool number ya naam bhejein.\nExample: *ChatGPT*`);
}

async function handleOrderState(runtime, msg, text, number, jid, conversation) {
  const state = conversation?.state || 'IDLE';
  const context = conversation?.context_data || {};
  const lower = String(text || '').trim().toLowerCase();

  if (state === 'SELECTING_TOOL') {
    const tool = isNumericChoice(text) ? TOOL_CATALOG[Number(text) - 1] || null : findToolByInput(text);
    if (!tool) {
      return runtime.sendText(jid, '❌ Tool samajh nahi aya. Tool number ya naam dobara bhejein.');
    }
    const rows = queries.getAvailabilitySnapshot(tool.slug);
    queries.upsertConversation(number, 'SELECTING_PLAN', { toolSlug: tool.slug });
    return runtime.sendText(jid, fmt.formatToolPlans(tool.name, rows));
  }

  if (state === 'SELECTING_PLAN') {
    const rows = queries.getAvailabilitySnapshot(context.toolSlug || '');
    const selectedPlan = selectPlanFromRows(rows, text);
    if (!selectedPlan) {
      return runtime.sendText(jid, '❌ Plan select nahi hua. Plan number ya naam dobara bhejein.');
    }
    const availabilityRows = queries.getAvailabilitySnapshot(selectedPlan.tool_slug);
    const accountOptions = queries.getPricingOptionsForPlan(selectedPlan.plan_id).map(option => {
      const availability = availabilityRows.find(
        row => row.plan_id === selectedPlan.plan_id && row.type_id === option.type_id
      ) || {};
      return {
        ...option,
        ...availability
      };
    });
    queries.upsertConversation(number, 'SELECTING_ACCOUNT_TYPE', {
      toolSlug: selectedPlan.tool_slug,
      planId: selectedPlan.plan_id
    });
    return runtime.sendText(jid, fmt.formatAccountTypeOptions(selectedPlan.plan_name, accountOptions));
  }

  if (state === 'SELECTING_ACCOUNT_TYPE') {
    const accountOptions = queries.getAvailabilitySnapshot(context.toolSlug || '').filter(row => row.plan_id === context.planId);
    const selectedType = selectAccountTypeFromRows(accountOptions, text);
    if (!selectedType) {
      return runtime.sendText(jid, '❌ Account type select nahi hua. Type number ya naam dobara bhejein.');
    }
    if (Number(selectedType.available_slots || 0) <= 0) {
      queries.upsertConversation(number, 'AWAITING_NOTIFY_CONFIRM', {
        toolSlug: selectedType.tool_slug,
        planSlug: selectedType.plan_slug,
        accountType: selectedType.type_name,
        label: `${selectedType.tool_name} ${selectedType.plan_name} — ${selectedType.type_label}`
      });
      return runtime.sendText(jid, `❌ ${selectedType.tool_name} ${selectedType.plan_name} — ${selectedType.type_label} abhi out of stock hai.\n\nStock wapas aaye to alert chahiye ho to *NOTIFY* likhein.\nYa reply *2* to check other availability.`);
    }
    queries.upsertConversation(number, 'AWAITING_CONFIRMATION', {
      toolSlug: selectedType.tool_slug,
      planId: selectedType.plan_id,
      typeId: selectedType.type_id,
      quantity: 1
    });
    if (selectedType.type_name === 'non_warranty') {
      queries.upsertConversation(number, 'AWAITING_NON_WARRANTY_YES', {
        toolSlug: selectedType.tool_slug,
        planId: selectedType.plan_id,
        typeId: selectedType.type_id,
        quantity: 1
      });
      return runtime.sendText(jid, fmt.formatPolicyWarning(selectedType));
    }
    return runtime.sendText(jid, fmt.formatPolicyWarning(selectedType));
  }

  if (state === 'AWAITING_NOTIFY_CONFIRM') {
    if (!/\b(notify|yes|alert)\b/i.test(text)) {
      queries.resetConversation(number);
      return runtime.sendText(jid, 'Theek hai. Menu ke liye *hi* ya availability ke liye *2* bhej dein.');
    }
    const row = queries.addNotifyMe({
      customerNumber: number,
      customerName: msg.pushName || number,
      toolSlug: context.toolSlug,
      planSlug: context.planSlug,
      accountType: context.accountType
    });
    queries.resetConversation(number);
    return runtime.sendText(jid, `✅ Notify request save ho gayi.\n\n${context.label || `${row.tool_slug} ${row.plan_slug}`}\nStock available hoti hi bot aap ko message karega.`);
  }

  if (state === 'AWAITING_NON_WARRANTY_YES') {
    if (lower !== 'yes') {
      return runtime.sendText(
        jid,
        'Non-warranty account par purchase ke baad koi claim, refund, ya replacement accept nahi hota.\n\nAgar aap is policy ko accept karte hain to pehle *YES* likhein.'
      );
    }
    queries.upsertConversation(number, 'AWAITING_CONFIRMATION', context);
    return runtime.sendText(
      jid,
      'Non-warranty policy accepted.\n\nFinal confirmation ke liye *CONFIRM* likhein.\nQuantity change karni ho to pehle number bhejein.'
    );
  }

  if (state === 'AWAITING_CONFIRMATION') {
    if (isNumericChoice(text)) {
      const quantity = Math.max(1, Number.parseInt(text, 10) || 1);
      queries.upsertConversation(number, 'AWAITING_CONFIRMATION', {
        ...context,
        quantity
      });
      return runtime.sendText(jid, `✅ Quantity set ho gayi: *${quantity}*\nAb *CONFIRM* likhein to order proceed ho jaye.`);
    }

    if (lower !== 'confirm') {
      return runtime.sendText(jid, `Policy accept karne ke liye *CONFIRM* likhein.\nAgar quantity change karni ho to sirf number bhejein.`);
    }

    const pricing = queries.getPricingForPlanType(context.planId, context.typeId);
    if (!pricing) {
      queries.resetConversation(number);
      return runtime.sendText(jid, '❌ Pricing record missing hai. Dobara order start karein.');
    }
    const order = queries.createOrder({
      customerNumber: number,
      customerName: msg.pushName || number,
      planId: context.planId,
      typeId: context.typeId,
      quantity: context.quantity || 1
    });

    n8nBridge.triggerOrderCreated({
      orderId: order.order_id,
      customerNumber: order.whatsapp_number,
      customerName: order.customer_name,
      toolSlug: order.tool_slug,
      toolName: order.tool_name,
      planSlug: order.plan_slug,
      planName: order.plan_name,
      accountType: order.type_name,
      accountTypeLabel: order.type_label,
      quantity: Number(order.quantity || 1),
      sellPrice: Number(order.sell_price || 0),
      buyPrice: Number(order.buy_price || 0),
      profit: Number(order.profit || 0),
      status: order.status,
      orderDate: order.order_date
    }, {
      channel: 'whatsapp_bot',
      stage: 'order_created'
    }).catch(() => {});

    queries.upsertConversation(number, 'AWAITING_PAYMENT', {
      orderId: order.order_id
    });

    return runtime.sendText(jid, fmt.paymentInstructions({
      orderId: order.order_id,
      toolName: order.tool_name,
      planName: order.plan_name,
      accountTypeLabel: order.type_label || order.type_name,
      quantity: Number(order.quantity || 1),
      total: Number(order.sell_price) * Number(order.quantity || 1),
      jazzCash: runtime.config.jazzCash,
      easyPaisa: runtime.config.easyPaisa,
      bankAccount: runtime.config.bankAccount,
      policyReminder: getPolicyWarning(order.type_name)
    }));
  }

  if (state === 'AWAITING_PAYMENT') {
    const hasImage = Boolean(msg.message?.imageMessage || msg.message?.documentMessage);
    if (!hasImage) {
      return runtime.sendText(jid, `Payment screenshot bhejein.\nOrder ID: *${context.orderId}*`);
    }

    const uploadsDir = path.join(runtime.baseDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const orderId = context.orderId;
    const fileName = msg.message?.documentMessage?.fileName || '';
    const extension = msg.message?.imageMessage
      ? 'jpg'
      : (path.extname(fileName).replace('.', '') || 'bin');
    const filePath = path.join(uploadsDir, `${orderId}-${Date.now()}.${extension}`);

    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger: pino({ level: 'silent' }), reuploadRequest: runtime.getPrimarySocket()?.updateMediaMessage }
    );
    fs.writeFileSync(filePath, buffer);

    const order = queries.attachPaymentScreenshot(orderId, filePath);
    queries.upsertConversation(number, 'AWAITING_VERIFICATION', { orderId });

    n8nBridge.triggerPaymentVerification({
      orderId: order.order_id,
      customerNumber: order.whatsapp_number,
      customerName: order.customer_name,
      toolSlug: order.tool_slug,
      planSlug: order.plan_slug,
      accountType: order.type_name,
      status: order.status,
      paymentScreenshot: filePath,
      submittedAt: new Date().toISOString()
    }, {
      channel: 'whatsapp_bot',
      stage: 'payment_submitted'
    }).catch(() => {});

    await runtime.sendText(jid, fmt.verificationPending(orderId));
    const adminJid = runtime.adminJid();
    if (adminJid) {
      await runtime.sendText(adminJid, fmt.adminPaymentAlert(order, filePath));
    }
    return true;
  }

  if (state === 'AWAITING_VERIFICATION') {
    return runtime.sendText(jid, `⏳ Aapka order verify ho raha hai.\nOrder ID: *${context.orderId}*`);
  }

  return false;
}

async function handleTrackOrder(runtime, jid, number, maybeOrderId = '') {
  const order = maybeOrderId?.startsWith('ORD-')
    ? queries.getOrderByOrderId(maybeOrderId)
    : queries.getLatestOrderForCustomer(number);
  return runtime.sendText(jid, fmt.orderStatus(order));
}

module.exports = {
  startOrderFlow,
  handleOrderState,
  handleTrackOrder
};
