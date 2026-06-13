function money(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`;
}

function divider() {
  return '━━━━━━━━━━━━━━━━━━━━';
}

function jsonArray(value) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function groupByPlan(rows = []) {
  const grouped = [];
  const map = new Map();
  rows.forEach(row => {
    const key = `${row.tool_slug}:${row.plan_slug}`;
    if (!map.has(key)) {
      map.set(key, {
        tool_name: row.tool_name,
        tool_slug: row.tool_slug,
        plan_name: row.plan_name,
        plan_slug: row.plan_slug,
        duration_days: row.duration_days,
        options: []
      });
      grouped.push(map.get(key));
    }
    map.get(key).options.push(row);
  });
  return grouped;
}

function formatStockLabel(row = {}) {
  const slots = Number(row.available_slots || 0);
  if (slots <= 0) return '❌ Out of stock — order flow mein *NOTIFY* likh kar alert lein';
  if (row.type_name === 'private') return `📦 Slots: ${slots} remaining`;
  return `📦 In stock (${slots} ready)`;
}

function formatPolicyOneLine(row = {}) {
  if (row.type_name === 'warranty') return '🛡️ 1x replacement + 2x issue resolution';
  if (row.type_name === 'non_warranty') return '⚠️ No claims after purchase';
  return '🔒 Shared login • limited slots';
}

function formatTypeBlock(row = {}, index = null) {
  const badge = row.is_limited_time ? ` (${row.limited_label || 'LIMITED TIME'})` : '';
  const prefix = index === null ? '' : `${index + 1}. `;
  return `${prefix}*${row.type_label}*\n💰 ${money(row.price)}${badge}\n${formatPolicyOneLine(row)}\n${formatStockLabel(row)}`;
}

function welcomeMessage(botName, greeting) {
  return `${greeting || 'Assalam o Alaikum'} 👋\n\n*${botName}* mein khush aamdeed.\n${divider()}\n\n1. View AI Tools & Prices\n2. Check Availability\n3. Place Order\n4. Track My Order\n5. Support / Issue\n\nReply *1, 2, 3, 4,* ya *5*.\nAap direct *price*, *available*, *order*, ya tool ka naam bhi bhej sakte hain.`;
}

function helpMessage() {
  return `🛠️ *Help Menu*\n${divider()}\n\n*Customer commands:*\n• price / rates\n• available / stock\n• order chatgpt plus private\n• track / ORD-XXXX\n• support / issue\n\n*Admin commands:*\n• !approve ORD-XXXX\n• !reject ORD-XXXX reason\n• !replace ORD-XXXX\n• !rates\n• !profit tool buy sell\n• !pricing chatgpt plus private 999\n• !limited chatgpt plus private on/off\n• !stock\n• !stock chatgpt\n• !addstock chatgpt plus private D-001 5\n• !restock chatgpt plus private D-001\n• !addkey chatgpt plus private D-001\n• !customer 923001234567\n• !trust 923001234567\n• !pending\n• !dealer D-001\n• !best chatgpt\n• !dealers\n• !contact D-001\n• !issue ORD-XXXX\n• !resolve ORD-XXXX resolution\n• !broadcast message\n• !orders\n• !stats\n• !scam number\n• !help`;
}

function formatDailyRates(rows = []) {
  if (!rows.length) {
    return `📊 *Aaj ke prices abhi ready nahi hain.*\n\nThori dair baad dobara check karein.`;
  }
  const plans = groupByPlan(rows);
  const blocks = plans.map((plan, index) => {
    const typeLines = plan.options.map((row, typeIndex) => formatTypeBlock(row, typeIndex)).join(`\n\n${divider()}\n\n`);
    return `${index + 1}. *${plan.tool_name} — ${plan.plan_name}*\n⏳ ${plan.duration_days} days\n\n${typeLines}`;
  });
  return `📊 *Today's AI Tools & Prices*\n${divider()}\n\n${blocks.join(`\n\n${divider()}\n\n`)}\n\nApna tool / plan / type reply karein.\nExample: *chatgpt plus private*`;
}

function formatAvailability(rows = [], title = 'Real-time Availability') {
  if (!rows.length) {
    return `📦 *${title}*\n${divider()}\n\nAbhi koi stock available nahi mila.`;
  }
  const plans = groupByPlan(rows);
  const blocks = plans.map(plan => {
    const typeLines = plan.options.map(row => formatTypeBlock(row)).join('\n\n');
    return `✅ *${plan.tool_name} — ${plan.plan_name}*\n\n${typeLines}`;
  });
  return `📦 *${title}*\n${divider()}\n\n${blocks.join(`\n\n${divider()}\n\n`)}`;
}

function formatToolPlans(toolName, rows = []) {
  if (!rows.length) {
    return `❌ ${toolName} ke plans available nahi mile.`;
  }
  const plans = groupByPlan(rows).map((plan, index) => {
    const privateOption = plan.options.find(item => item.type_name === 'private');
    const startingPrice = privateOption ? privateOption.price : Math.min(...plan.options.map(item => Number(item.price || 0)));
    return `${index + 1}. *${plan.plan_name}*\n💰 Start from ${money(startingPrice)}\n📦 ${plan.options.reduce((sum, item) => sum + Number(item.available_slots || 0), 0)} total slots`;
  });
  return `🤖 *${toolName} Plans*\n${divider()}\n\n${plans.join(`\n\n${divider()}\n\n`)}\n\nPlan number ya plan name bhejein.`;
}

function formatAccountTypeOptions(planName, rows = []) {
  if (!rows.length) return `❌ Is plan ke account types available nahi mile.`;
  const lines = rows.map((row, index) => formatTypeBlock(row, index));
  return `🎯 *${planName} — Account Types*\n${divider()}\n\n${lines.join(`\n\n${divider()}\n\n`)}\n\nType number ya naam bhejein.`;
}

function formatPolicyWarning(selection = {}) {
  const confirmLine = selection.type_name === 'non_warranty'
    ? 'Step 1: *YES* likhein to non-warranty disclaimer accept ho.\nStep 2: us ke baad *CONFIRM* likhein to order proceed ho.'
    : 'Agar agree karte hain to *CONFIRM* likhein.';
  return `⚠️ *Policy Check*\n${divider()}\n\n*${selection.tool_name} ${selection.plan_name}*\n*${selection.type_label}*\n💰 ${money(selection.price)}${selection.is_limited_time ? ` (${selection.limited_label || 'LIMITED TIME'})` : ''}\n📦 ${formatStockLabel(selection)}\n\n${selection.policy_text || selection.policy_summary}\n\n${confirmLine}\nAgar 1 se zyada chahiye ho to pehle quantity bhej dein.\nExample: *2*`;
}

function paymentInstructions({ orderId, toolName, planName, accountTypeLabel, quantity, total, jazzCash, easyPaisa, bankAccount, policyReminder }) {
  return `🧾 *Order Confirmed*\n${divider()}\n\n*Order ID:* ${orderId}\n*Tool:* ${toolName} ${planName}\n*Type:* ${accountTypeLabel}\n*Qty:* ${quantity}\n*Total:* ${money(total)}\n\n💳 *Payment Methods*\n• JazzCash: *${jazzCash}*\n• Easypaisa: *${easyPaisa}*\n• Bank: *${bankAccount}*\n\n${policyReminder}\n\nPayment screenshot bhej dein. Har payment proof ke sath *${orderId}* mention rakhein.`;
}

function verificationPending(orderId) {
  return `⏳ Payment screenshot mil gaya.\n\n*Verification in progress*\nOrder ID: *${orderId}*\n\nApprove hote hi delivery isi chat mein aa jayegi.`;
}

function adminPaymentAlert(order, filePath) {
  return `💸 *Payment Proof Received*\n${divider()}\n\nOrder: *${order.order_id}*\nCustomer: *${order.customer_name || order.whatsapp_number}*\nNumber: *${order.whatsapp_number}*\nTool: *${order.tool_name} ${order.plan_name}*\nType: *${order.type_label || order.type_name || 'N/A'}*\nTotal: *${money(Number(order.sell_price) * Number(order.quantity || 1))}*\nScreenshot: ${filePath}\n\nApprove:\n*!approve ${order.order_id}*`;
}

function deliveryMessage(order, stocks = [], invoiceText = '', policyReminder = '') {
  const credentialBlocks = stocks.map((stock, index) => {
    const lines = [];
    if (stock.key_value) lines.push(`🔑 Key: *${stock.key_value}*`);
    if (stock.account_email) lines.push(`📧 Email: *${stock.account_email}*`);
    if (stock.account_pass) lines.push(`🔐 Password: *${stock.account_pass}*`);
    if (stock.extra_info) lines.push(`📝 Extra: ${stock.extra_info}`);
    return `Account ${index + 1}\n${lines.join('\n')}`;
  }).join(`\n\n${divider()}\n\n`);

  return `✅ *Order Delivered*\n${divider()}\n\nOrder ID: *${order.order_id}*\nTool: *${order.tool_name} ${order.plan_name}*\nType: *${order.type_label || order.type_name || ''}*\n\n${credentialBlocks}\n\n${policyReminder}\n\nAgar login issue ho to isi chat mein *issue* likhein.\n\n${invoiceText}`;
}

function orderStatus(order) {
  if (!order) {
    return `❌ Koi order nahi mila.\nOrder ID bhejein ya menu se *4* choose karein.`;
  }
  return `📦 *Order Status*\n${divider()}\n\nOrder: *${order.order_id}*\nTool: *${order.tool_name} ${order.plan_name}*\nType: *${order.type_label || order.type_name || 'N/A'}*\nStatus: *${order.status}*\nDate: ${new Date(order.order_date).toLocaleString('en-PK')}`;
}

function stockList(rows = []) {
  if (!rows.length) return `📭 Abhi stock configured nahi hai.`;
  return `📦 *Stock Summary*\n${divider()}\n\n${rows.map(row => `• *${row.tool_name} ${row.plan_name} — ${row.type_label}* = ${row.available} available`).join('\n')}`;
}

function bestRatesAdmin(rows = []) {
  if (!rows.length) return `📉 Aaj koi dealer rates save nahi hui.`;
  return `🧾 *Today's Dealer Rates*\n${divider()}\n\n${rows.map(row => `• ${row.tool_slug} ${row.plan_name} — ${money(row.buy_price)} (${row.dealer_number})`).join('\n')}`;
}

function pendingOrders(rows = []) {
  if (!rows.length) return `✅ Aaj koi pending order nahi.`;
  return `🕒 *Pending Orders*\n${divider()}\n\n${rows.map(row => `• *${row.order_id}* — ${row.customer_name || row.whatsapp_number}\n  ${row.tool_name} ${row.plan_name} / ${row.type_label || 'Type N/A'}\n  Status: ${row.status}`).join('\n\n')}`;
}

function salesStats(stats) {
  return `📈 *Today's Sales Summary*\n${divider()}\n\n💰 Revenue: *${money(stats.revenue)}*\n💵 Profit: *${money(stats.profit)}*\n🧾 Orders: *${stats.orders_count || 0}*\n\n${(stats.topTools || []).length ? `Top tools:\n${stats.topTools.map(item => `• ${item.tool_name} — ${item.quantity}`).join('\n')}` : 'Top tools: none yet'}`;
}

function broadcastDone(sent, failed) {
  return `📣 Broadcast done.\n✅ Sent: ${sent}\n❌ Failed: ${failed}`;
}

function lowStockAlert(rows = []) {
  if (!rows.length) return '';
  return `⚠️ *Low Stock Alert*\n${divider()}\n\n${rows.map(row => `• ${row.tool_name} ${row.plan_name} — ${row.type_label} = ${row.available} left`).join('\n')}`;
}

function issuePrompt(order = null) {
  if (!order) {
    return `🛠️ *Support / Issue*\n${divider()}\n\nApna *Order ID* bhejein ya issue detail likhein.\nExample: *ORD-123456* ya *login nahi ho raha*`;
  }
  return `🛠️ *Support / Issue*\n${divider()}\n\nLatest order linked: *${order.order_id}*\nTool: *${order.tool_name} ${order.plan_name}*\nType: *${order.type_label || order.type_name || 'N/A'}*\n\nAb apna issue detail bhejein.`;
}

function issueDecisionMessage(order, supportDecision, issueAnalysis) {
  return `🧠 *Issue Triage*\n${divider()}\n\nOrder: *${order.order_id}*\nType: *${order.type_label || order.type_name || 'N/A'}*\n\n${supportDecision.message}\n\nQuick help:\n${issueAnalysis.simpleReply}\n\n${issueAnalysis.needsAdmin ? 'Admin ko bhi alert bhej diya gaya hai.' : 'Agar is se masla solve na ho to reply mein *admin* likhein.'}`;
}

function issueDeclineMessage(order, supportDecision) {
  return `⚠️ *Support Update*\n${divider()}\n\nOrder: *${order.order_id}*\nType: *${order.type_label || order.type_name || 'N/A'}*\n\n${supportDecision.message}`;
}

function issueHistoryMessage(orderId, rows = []) {
  if (!rows.length) return `ℹ️ *${orderId}* ke liye abhi koi issue history nahi mili.`;
  return `🗂️ *Issue History — ${orderId}*\n${divider()}\n\n${rows.map((row, index) => `${index + 1}. Status: *${row.status}*\nDescription: ${row.description}\nResolution: ${row.resolution || 'Pending'}\nCreated: ${new Date(row.created_at).toLocaleString('en-PK')}`).join(`\n\n${divider()}\n\n`)}`;
}

function issueResolvedMessage(orderId, resolution) {
  return `✅ *Issue Resolved*\n${divider()}\n\nOrder: *${orderId}*\nResolution: ${resolution}`;
}

function botServiceMenu() {
  return `🤖 *Bot Service Menu*\n${divider()}\n\nAgar aap apna WhatsApp bot / automation system banwana chahte hain to yeh options available hain:\n1. Sales bot\n2. CRM + inbox setup\n3. Group automation\n4. Custom AI support bot\n\nApni requirement short mein bhej dein.`;
}

function adminLeadAlert(number, name, text) {
  return `🔥 *New Bot Service Lead*\n${divider()}\n\nName: *${name || 'Unknown'}*\nNumber: *${number}*\nMessage: ${text}`;
}

function dealerPendingList(rows = []) {
  if (!rows.length) return '✅ *No pending trust verifications.*';
  return `🟡 *Pending Dealer Trust*\n${divider()}\n\n${rows.map((row, index) => `${index + 1}. *${row.dealer_number}*\nTools: ${jsonArray(row.tools_mentioned).join(', ') || 'Unknown'}\nYES: ${row.yes_votes} | NO: ${row.no_votes}\nGroup: ${row.group_name || row.group_id || 'N/A'}`).join(`\n\n${divider()}\n\n`)}`;
}

function dealerTrustProfile(profile) {
  if (!profile) return '❌ Dealer not found.';
  return `👤 *Dealer Profile*\n${divider()}\n\n` +
    `Code: *${profile.dealer_code}*\n` +
    `Name: *${profile.name || 'Unknown'}*\n` +
    `WhatsApp: *${profile.whatsapp_number}*\n` +
    `Trust Score: *${Number(profile.trust_score || 0).toFixed(2)}*\n` +
    `Orders Completed: *${profile.total_orders_placed || 0}*\n` +
    `Last Active: ${profile.last_active || 'N/A'}\n` +
    `Tools: ${(profile.tools_available || []).join(', ') || 'N/A'}`;
}

function dealerLeaderboard(rows = []) {
  if (!rows.length) return 'ℹ️ Trusted dealers list empty hai.';
  return `🏆 *Top Trusted Dealers*\n${divider()}\n\n${rows.map((row, index) => `${index + 1}. *${row.dealer_code}* — ${row.name || row.whatsapp_number}\nTrust: ${Number(row.trust_score || 0).toFixed(2)} | Orders: ${row.total_orders_placed || 0}`).join(`\n\n`)}`;
}

function bestDealerMessage(result) {
  if (!result) return '❌ Best dealer data available nahi.';
  return `💡 *Best Dealer for ${result.tool_slug}*\n${divider()}\n\n` +
    `Dealer: *${result.dealer_code || 'Unverified'} ${result.dealer_name || ''}*\n` +
    `WhatsApp: ${result.whatsapp_number || 'N/A'}\n` +
    `Lowest: *${money(result.lowest_price)}*\n` +
    `Average: *${money(result.avg_price)}*\n` +
    `Trust Score: *${Number(result.trust_score || 0).toFixed(2)}*`;
}

function dealerStockTable(rows = []) {
  if (!rows.length) return `📦 Abhi stock inventory empty hai.`;
  return `📦 *Stock Inventory*\n${divider()}\n\n${rows.map(row => `• *${row.tool_slug} ${row.plan_slug}*\nPrivate: ${row.private || 0} | Warranty: ${row.warranty || 0} | Non-W: ${row.non_warranty || 0}\nPrimary Dealer: ${row.primary_dealer_code || 'N/A'}`).join(`\n\n`)}`;
}

function dealerToolStockDetails(rows = []) {
  if (!rows.length) return `📦 Is tool ka stock data available nahi.`;
  return `📦 *Tool Stock Detail*\n${divider()}\n\n${rows.map(row => `• ${row.tool_slug} ${row.plan_slug} (${row.account_type})\nAvailable: ${row.quantity_available}/${row.quantity_total}\nPrimary: ${row.primary_dealer_code || 'N/A'} | Backup: ${row.backup_dealer_code || 'N/A'}`).join(`\n\n`)}`;
}

function dealerRatesDigest(rows = []) {
  if (!rows.length) return `📉 Aaj ke dealer rates empty hain.`;
  return `📉 *Today's Dealer Rates*\n${divider()}\n\n${rows.map(row => `• ${row.tool_slug} ${row.plan_name}\n${money(row.buy_price)} | ${row.dealer_code || 'Unverified'} ${row.dealer_name || row.dealer_number}\nStatus: ${row.trust_status || 'trusted'}`).join(`\n\n`)}`;
}

module.exports = {
  money,
  divider,
  welcomeMessage,
  helpMessage,
  formatDailyRates,
  formatAvailability,
  formatToolPlans,
  formatAccountTypeOptions,
  formatPolicyWarning,
  paymentInstructions,
  verificationPending,
  adminPaymentAlert,
  deliveryMessage,
  orderStatus,
  stockList,
  bestRatesAdmin,
  pendingOrders,
  salesStats,
  broadcastDone,
  lowStockAlert,
  issuePrompt,
  issueDecisionMessage,
  issueDeclineMessage,
  issueHistoryMessage,
  issueResolvedMessage,
  botServiceMenu,
  adminLeadAlert,
  dealerPendingList,
  dealerTrustProfile,
  dealerLeaderboard,
  bestDealerMessage,
  dealerStockTable,
  dealerToolStockDetails,
  dealerRatesDigest
};
