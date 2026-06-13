const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');
const { analyzeIssueText, evaluateIssueSupport } = require('../../utils/policyChecker');

async function startIssueFlow(runtime, jid, number, seedText = '') {
  const latestOrder = queries.getLatestOrderForCustomer(number);
  if (!latestOrder) {
    queries.upsertConversation(number, 'AWAITING_ISSUE_ORDER', {});
    return runtime.sendText(jid, fmt.issuePrompt(null));
  }

  queries.upsertConversation(number, 'AWAITING_ISSUE_DESCRIPTION', {
    orderId: latestOrder.order_id
  });

  if (seedText && !/^(5|support|issue|help)$/i.test(String(seedText).trim())) {
    return handleIssueState(runtime, seedText, number, jid, queries.getConversation(number));
  }

  return runtime.sendText(jid, fmt.issuePrompt(latestOrder));
}

async function alertAdminForIssue(runtime, order, description, issueAnalysis) {
  const adminJid = runtime.adminJid();
  if (!adminJid) return;
  await runtime.sendText(
    adminJid,
    `🚨 *Issue Alert*\n${fmt.divider()}\n\nOrder: *${order.order_id}*\nCustomer: *${order.customer_name || order.whatsapp_number}*\nType: *${order.type_label || order.type_name || 'N/A'}*\nIssue: ${description}\n\nAI note: ${issueAnalysis.simpleReply}`
  );
}

async function handleIssueState(runtime, text, number, jid, conversation) {
  const state = conversation?.state || 'IDLE';
  const context = conversation?.context_data || {};
  const trimmed = String(text || '').trim();
  const upper = trimmed.toUpperCase();

  if (state === 'AWAITING_ISSUE_ORDER') {
    const order = upper.startsWith('ORD-') ? queries.getOrderByOrderId(upper) : queries.getLatestOrderForCustomer(number);
    if (!order) {
      return runtime.sendText(jid, '❌ Order nahi mila. Correct *ORD-XXXX* bhejein.');
    }
    queries.upsertConversation(number, 'AWAITING_ISSUE_DESCRIPTION', { orderId: order.order_id });
    return runtime.sendText(jid, fmt.issuePrompt(order));
  }

  if (state === 'AWAITING_ISSUE_DESCRIPTION') {
    const order = queries.getOrderByOrderId(context.orderId || upper);
    if (!order) {
      queries.upsertConversation(number, 'AWAITING_ISSUE_ORDER', {});
      return runtime.sendText(jid, '❌ Is order ID par record nahi mila. Dobara order ID bhejein.');
    }

    if (upper.startsWith('ORD-') && trimmed.length <= 20) {
      queries.upsertConversation(number, 'AWAITING_ISSUE_DESCRIPTION', { orderId: upper });
      return runtime.sendText(jid, `✅ Order linked: *${upper}*\nAb issue detail bhejein.`);
    }

    const supportDecision = evaluateIssueSupport(order);
    if (!supportDecision.allowed) {
      queries.resetConversation(number);
      return runtime.sendText(jid, fmt.issueDeclineMessage(order, supportDecision));
    }

    const issueAnalysis = analyzeIssueText(trimmed);
    queries.createIssue({
      orderId: order.order_id,
      description: trimmed,
      aiNotes: issueAnalysis.simpleReply
    });
    queries.resetConversation(number);
    if (issueAnalysis.needsAdmin) {
      await alertAdminForIssue(runtime, order, trimmed, issueAnalysis);
    }
    return runtime.sendText(jid, fmt.issueDecisionMessage(order, supportDecision, issueAnalysis));
  }

  return false;
}

module.exports = {
  startIssueFlow,
  handleIssueState
};
