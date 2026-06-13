const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');
const { approveAndDeliver } = require('../flows/delivery');
const trustManager = require('../dealerIntelligence/trustManager');
const stockManager = require('../dealerIntelligence/stockManager');
const dealerAccess = require('../dealerIntelligence/dealerAccess');
const priceAnalytics = require('../dealerIntelligence/priceAnalytics');
const { getDeliveryReminder } = require('../../utils/policyChecker');

const pendingAdminActions = new Map();

function isAdmin(runtime, number) {
  return runtime.config.adminNumbers.includes(number);
}

function parseStockArgs(args = []) {
  if (args.length < 3) return null;
  const qty = Number.parseInt(args[args.length - 1], 10);
  const typeInput = args[args.length - 2];
  const toolPlanInput = args.slice(0, -2).join(' ').trim();
  if (!toolPlanInput || !typeInput || !qty) return null;
  return { toolPlanInput, typeInput, qty: Math.max(0, qty) };
}

function parseToolAndType(args = []) {
  if (args.length < 2) return null;
  return {
    toolPlanInput: args.slice(0, -1).join(' ').trim(),
    typeInput: args[args.length - 1]
  };
}

function parseAddStockArgs(args = []) {
  if (args.length < 4) return null;
  const qty = Number.parseInt(args[args.length - 1], 10);
  const dealerCode = String(args[args.length - 2] || '').trim().toUpperCase();
  const typeInput = args[args.length - 3];
  const toolPlanInput = args.slice(0, -3).join(' ').trim();
  if (!toolPlanInput || !typeInput || !dealerCode || !qty) return null;
  return { toolPlanInput, typeInput, dealerCode, qty: Math.max(0, qty) };
}

function parseRestockArgs(args = []) {
  if (args.length < 3) return null;
  return {
    toolPlanInput: args.slice(0, -2).join(' ').trim(),
    typeInput: args[args.length - 2],
    dealerCode: String(args[args.length - 1] || '').trim().toUpperCase()
  };
}

function parsePricingArgs(args = []) {
  if (args.length < 3) return null;
  const price = Number(args[args.length - 1]);
  const typeInput = args[args.length - 2];
  const toolPlanInput = args.slice(0, -2).join(' ').trim();
  if (!toolPlanInput || !typeInput || !Number.isFinite(price) || price <= 0) return null;
  return { toolPlanInput, typeInput, price };
}

function parseLimitedArgs(args = []) {
  if (args.length < 3) return null;
  const flag = String(args[args.length - 1] || '').toLowerCase();
  const typeInput = args[args.length - 2];
  const toolPlanInput = args.slice(0, -2).join(' ').trim();
  if (!toolPlanInput || !typeInput || !['on', 'off'].includes(flag)) return null;
  return { toolPlanInput, typeInput, enabled: flag === 'on' };
}

async function handlePendingAdminAction(runtime, number, jid, text) {
  const pending = pendingAdminActions.get(number);
  if (!pending) return false;

  if (pending.type === 'addkey') {
    const [keyValue, accountEmail, accountPass, ...extraParts] = text.split('|').map(item => item.trim());
    if (!keyValue && !accountEmail) {
      await runtime.sendText(jid, 'Format: key | email | pass | extra');
      return true;
    }
    try {
      const result = stockManager.addStockKey({
        toolInput: pending.toolPlanInput,
        typeInput: pending.typeInput,
        dealerCode: pending.dealerCode || '',
        keyValue,
        accountEmail,
        accountPass,
        extraInfo: extraParts.join(' | ')
      });
      pendingAdminActions.delete(number);
      await runtime.sendText(
        jid,
        `✅ Stock key added for *${result.resolved.tool.name} ${result.resolved.plan.planName} — ${result.resolved.accountType.label}*\nDealer: *${pending.dealerCode || 'N/A'}*`
      );
      await stockManager.notifyWaitingCustomers(runtime, result.inventory, result.resolved);
    } catch (error) {
      await runtime.sendText(jid, `❌ ${error.message}`);
    }
    return true;
  }

  return false;
}

async function handleAdminCommand(runtime, jid, number, text) {
  if (!isAdmin(runtime, number)) return false;
  if (await handlePendingAdminAction(runtime, number, jid, text)) return true;
  if (!text.startsWith('!')) return false;

  const [command, ...args] = text.trim().split(/\s+/);

  if (command === '!approve') {
    const orderId = args[0];
    if (!orderId) {
      await runtime.sendText(jid, 'Usage: !approve ORD-XXXX');
      return true;
    }
    try {
      await approveAndDeliver(runtime, orderId, jid);
    } catch (error) {
      await runtime.sendText(jid, `❌ ${error.message}`);
    }
    return true;
  }

  if (command === '!reject') {
    const orderId = String(args[0] || '').toUpperCase();
    const reason = args.slice(1).join(' ').trim() || 'Payment not verified';
    if (!orderId) {
      await runtime.sendText(jid, 'Usage: !reject ORD-XXXX reason');
      return true;
    }
    try {
      const order = queries.rejectOrder(orderId, reason);
      if (!order) throw new Error('Order not found');
      await runtime.sendText(`${order.whatsapp_number}@s.whatsapp.net`, `âŒ *Order Cancelled*\nOrder ID: *${order.order_id}*\nReason: ${reason}`);
      await runtime.sendText(jid, `âœ… ${orderId} rejected and customer notified.`);
    } catch (error) {
      await runtime.sendText(jid, `âŒ ${error.message}`);
    }
    return true;
  }

  if (command === '!replace') {
    const orderId = String(args[0] || '').toUpperCase();
    if (!orderId) {
      await runtime.sendText(jid, 'Usage: !replace ORD-XXXX');
      return true;
    }
    try {
      const result = queries.replaceOrderStock(orderId);
      await runtime.sendText(
        `${result.order.whatsapp_number}@s.whatsapp.net`,
        fmt.deliveryMessage(result.order, result.stocks, '', getDeliveryReminder(result.order.type_name))
      );
      await runtime.sendText(jid, `âœ… Replacement sent for *${orderId}*.`);
    } catch (error) {
      await runtime.sendText(jid, `âŒ ${error.message}`);
    }
    return true;
  }

  if (command === '!rates') {
    await runtime.sendText(jid, fmt.dealerRatesDigest(queries.getAllTodayRates()));
    return true;
  }

  if (command === '!profit') {
    const [tool, buy, sell] = args;
    const buyNum = Number(buy || 0);
    const sellNum = Number(sell || 0);
    if (!tool || !buyNum || !sellNum) {
      await runtime.sendText(jid, 'Usage: !profit tool buy sell');
      return true;
    }
    const percent = buyNum ? (((sellNum - buyNum) / buyNum) * 100).toFixed(2) : '0.00';
    await runtime.sendText(jid, `💰 *Profit Calculator*\nTool: ${tool}\nBuy: ${fmt.money(buyNum)}\nSell: ${fmt.money(sellNum)}\nMargin: *${percent}%*`);
    return true;
  }

  if (command === '!pricing') {
    const parsed = parsePricingArgs(args);
    if (!parsed) {
      await runtime.sendText(jid, 'Usage: !pricing tool plan type price\nExample: !pricing chatgpt plus private 999');
      return true;
    }
    try {
      const pricing = queries.updatePricing(parsed.toolPlanInput, parsed.typeInput, parsed.price);
      await runtime.sendText(jid, `âœ… Price updated\n*${pricing.tool_name} ${pricing.plan_name} â€” ${pricing.type_label}*\nNew price: *${fmt.money(pricing.price)}*`);
    } catch (error) {
      await runtime.sendText(jid, `âŒ ${error.message}`);
    }
    return true;
  }

  if (command === '!limited') {
    const parsed = parseLimitedArgs(args);
    if (!parsed) {
      await runtime.sendText(jid, 'Usage: !limited tool plan type on/off\nExample: !limited chatgpt plus private on');
      return true;
    }
    try {
      const pricing = queries.toggleLimitedBadge(parsed.toolPlanInput, parsed.typeInput, parsed.enabled);
      await runtime.sendText(jid, `âœ… Limited badge ${parsed.enabled ? 'ON' : 'OFF'}\n*${pricing.tool_name} ${pricing.plan_name} â€” ${pricing.type_label}*`);
    } catch (error) {
      await runtime.sendText(jid, `âŒ ${error.message}`);
    }
    return true;
  }

  if (command === '!stock') {
    if (!args.length) {
      await runtime.sendText(jid, fmt.dealerStockTable(stockManager.getInventoryMatrix()));
      return true;
    }

    if (/^\d+$/.test(String(args[args.length - 1] || ''))) {
      const parsed = parseStockArgs(args);
      if (!parsed) {
        await runtime.sendText(jid, 'Usage: !stock tool plan type qty\nExample: !stock chatgpt plus private 3');
        return true;
      }
      try {
        const pricing = queries.updateManualSlots(parsed.toolPlanInput, '', parsed.typeInput, parsed.qty);
        await runtime.sendText(
          jid,
          `✅ Availability updated for *${pricing.tool_name} ${pricing.plan_name} — ${pricing.type_label}*\nSlots: *${parsed.qty}*`
        );
        await stockManager.notifyWaitingCustomers(runtime, {
          tool_slug: pricing.tool_slug,
          plan_slug: pricing.plan_slug,
          account_type: pricing.type_name,
          quantity_available: parsed.qty
        }, {
          tool: { name: pricing.tool_name },
          plan: { planName: pricing.plan_name },
          accountType: { label: pricing.type_label }
        });
      } catch (error) {
        await runtime.sendText(jid, `❌ ${error.message}`);
      }
      return true;
    }

    if (args.length === 1 || String(args[args.length - 1] || '').toUpperCase().startsWith('D-') === false) {
      await runtime.sendText(jid, fmt.dealerToolStockDetails(stockManager.getToolInventory(args.join(' '))));
      return true;
    }
    await runtime.sendText(jid, 'Usage:\n!stock\n!stock chatgpt\n!stock chatgpt plus private 3\nFor dealer stock use: !addstock chatgpt plus private D-001 5');
    return true;
  }

  if (command === '!addstock') {
    const parsed = parseAddStockArgs(args);
    if (!parsed) {
      await runtime.sendText(jid, 'Usage: !addstock tool plan type D-001 qty\nExample: !addstock chatgpt plus private D-001 5');
      return true;
    }
    try {
      const result = stockManager.addStockQuantity(parsed.toolPlanInput, parsed.typeInput, parsed.dealerCode, parsed.qty);
      await runtime.sendText(
        jid,
        `✅ Inventory updated\nTool: *${result.resolved.tool.name} ${result.resolved.plan.planName}*\nType: *${result.resolved.accountType.label}*\nDealer: *${parsed.dealerCode}*\nAvailable: *${result.inventory.quantity_available}*`
      );
      await stockManager.notifyWaitingCustomers(runtime, result.inventory, result.resolved);
    } catch (error) {
      await runtime.sendText(jid, `❌ ${error.message}`);
    }
    return true;
  }

  if (command === '!addkey') {
    const parsed = parseRestockArgs(args);
    if (!parsed) {
      await runtime.sendText(jid, 'Usage: !addkey tool plan type D-001\nExample: !addkey chatgpt plus private D-001');
      return true;
    }
    pendingAdminActions.set(number, {
      type: 'addkey',
      toolPlanInput: parsed.toolPlanInput,
      typeInput: parsed.typeInput,
      dealerCode: parsed.dealerCode
    });
    await runtime.sendText(jid, `Ab detail bhejein for *${parsed.dealerCode}*:\n*key | email | pass | extra*`);
    return true;
  }

  if (command === '!restock') {
    const parsed = parseRestockArgs(args);
    if (!parsed) {
      await runtime.sendText(jid, 'Usage: !restock tool plan type D-001\nExample: !restock chatgpt plus private D-001');
      return true;
    }
    try {
      await stockManager.requestRestock(runtime, parsed.toolPlanInput, parsed.typeInput, parsed.dealerCode);
      await runtime.sendText(jid, `📨 Restock request sent to *${parsed.dealerCode}*`);
    } catch (error) {
      await runtime.sendText(jid, `❌ ${error.message}`);
    }
    return true;
  }

  if (command === '!broadcast') {
    const message = args.join(' ').trim();
    if (!message) {
      await runtime.sendText(jid, 'Usage: !broadcast message');
      return true;
    }
    const result = await runtime.broadcastToCustomerGroups(message);
    queries.saveBroadcast({
      message,
      targetGroups: runtime.config.customerGroups,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
    await runtime.sendText(jid, fmt.broadcastDone(result.sent.length, result.failed.length));
    return true;
  }

  if (command === '!orders') {
    await runtime.sendText(jid, fmt.pendingOrders(queries.getPendingOrdersToday()));
    return true;
  }

  if (command === '!customer') {
    const customerNumber = args[0];
    if (!customerNumber) {
      await runtime.sendText(jid, 'Usage: !customer 923001234567');
      return true;
    }
    const profile = queries.getCustomerProfile(customerNumber);
    if (!profile) {
      await runtime.sendText(jid, 'âŒ Customer not found.');
      return true;
    }
    await runtime.sendText(
      jid,
      `ðŸ‘¤ *Customer Profile*\n${fmt.divider()}\n\nName: *${profile.name || 'Customer'}*\nNumber: *${profile.whatsapp_number}*\nOrders: *${profile.total_orders || 0}*\nSpent: *${fmt.money(profile.total_spent || 0)}*\nVIP: ${profile.is_vip ? 'Yes' : 'No'}\nBlocked: ${profile.is_blocked ? 'Yes' : 'No'}\n\nRecent:\n${(profile.orders || []).map(order => `â€¢ ${order.order_id} — ${order.tool_name} ${order.plan_name} — ${order.status}`).join('\n') || 'No orders'}`
    );
    return true;
  }

  if (command === '!issue') {
    const orderId = String(args[0] || '').toUpperCase();
    if (!orderId) {
      await runtime.sendText(jid, 'Usage: !issue ORD-XXXX');
      return true;
    }
    await runtime.sendText(jid, fmt.issueHistoryMessage(orderId, queries.getIssueHistory(orderId)));
    return true;
  }

  if (command === '!resolve') {
    const orderId = String(args[0] || '').toUpperCase();
    const resolution = args.slice(1).join(' ').trim() || 'Resolved by admin';
    if (!orderId) {
      await runtime.sendText(jid, 'Usage: !resolve ORD-XXXX resolution');
      return true;
    }
    try {
      queries.resolveIssue(orderId, resolution);
      await runtime.sendText(jid, fmt.issueResolvedMessage(orderId, resolution));
    } catch (error) {
      await runtime.sendText(jid, `❌ ${error.message}`);
    }
    return true;
  }

  if (command === '!scam') {
    const numberToFlag = args[0];
    const reason = args.slice(1).join(' ') || 'Flagged by admin';
    if (!numberToFlag) {
      await runtime.sendText(jid, 'Usage: !scam number reason');
      return true;
    }
    trustManager.flagScammer(numberToFlag, reason, '');
    await runtime.sendText(jid, `🚫 Number flagged: *${numberToFlag}*`);
    return true;
  }

  if (command === '!trust') {
    const dealerNumber = args[0];
    if (!dealerNumber) {
      await runtime.sendText(jid, 'Usage: !trust 923001234567');
      return true;
    }
    try {
      const trusted = trustManager.addTrustedDealer({ dealerNumber, manual: true });
      await runtime.sendText(jid, `✅ Dealer trusted manually.\nCode: *${trusted.dealer_code}*\nTrust score: *${Number(trusted.trust_score || 0).toFixed(2)}*`);
    } catch (error) {
      await runtime.sendText(jid, `❌ ${error.message}`);
    }
    return true;
  }

  if (command === '!untrust') {
    const dealerNumber = args[0];
    if (!dealerNumber) {
      await runtime.sendText(jid, 'Usage: !untrust 923001234567');
      return true;
    }
    trustManager.removeTrustedDealer(dealerNumber);
    await runtime.sendText(jid, '✅ Dealer removed from trusted list.');
    return true;
  }

  if (command === '!pending') {
    await runtime.sendText(jid, fmt.dealerPendingList(trustManager.listPendingTrust()));
    return true;
  }

  if (command === '!trustscore') {
    const code = args[0];
    if (!code) {
      await runtime.sendText(jid, 'Usage: !trustscore D-001');
      return true;
    }
    await runtime.sendText(jid, fmt.dealerTrustProfile(dealerAccess.getDealerProfile(code)));
    return true;
  }

  if (command === '!dealer') {
    const code = args[0];
    if (!code) {
      await runtime.sendText(jid, 'Usage: !dealer D-001');
      return true;
    }
    await runtime.sendText(jid, fmt.dealerTrustProfile(dealerAccess.getDealerProfile(code)));
    return true;
  }

  if (command === '!best') {
    const toolSlug = args[0];
    if (!toolSlug) {
      await runtime.sendText(jid, 'Usage: !best chatgpt');
      return true;
    }
    await runtime.sendText(jid, fmt.bestDealerMessage(dealerAccess.getBestDealerForTool(toolSlug)));
    return true;
  }

  if (command === '!dealers') {
    await runtime.sendText(jid, fmt.dealerLeaderboard(dealerAccess.getAllTrustedDealers().slice(0, 10)));
    return true;
  }

  if (command === '!contact') {
    const code = args[0];
    const profile = dealerAccess.getDealerProfile(code);
    if (!profile) {
      await runtime.sendText(jid, '❌ Dealer not found.');
      return true;
    }
    await runtime.sendText(jid, `📞 *${profile.dealer_code}* — ${profile.name}\nWhatsApp: https://wa.me/${profile.whatsapp_number}`);
    return true;
  }

  if (command === '!stats') {
    await runtime.sendText(jid, fmt.salesStats(queries.getTodaySalesStats()));
    return true;
  }

  if (command === '!help') {
    await runtime.sendText(jid, fmt.helpMessage());
    return true;
  }

  await runtime.sendText(jid, fmt.helpMessage());
  return true;
}

module.exports = {
  handleAdminCommand
};
