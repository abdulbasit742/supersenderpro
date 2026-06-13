const config = require('./config');

function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString('en-PK')}`;
}

function welcomeMenu(name = '') {
  return `👋 Assalam o Alaikum${name ? ` ${name}` : ''}!

🤖 *${config.storeName}* mein khush aamdeed.

Available commands:
1️⃣ *price* / *rates* - Today's price list
2️⃣ *stock* - Available tools
3️⃣ *order chatgpt* - Order start karein
4️⃣ *help* - Command list

AI tools: ChatGPT, Claude, Midjourney, Cursor, Gemini.`;
}

function helpMenu(isAdmin = false) {
  const base = `🧭 *Bot Commands*

Customer:
• price / rates
• stock
• order chatgpt
• help
• hi / salam / menu`;

  if (!isAdmin) return base;
  return `${base}

Admin:
• !rates
• !profit [tool] [buy] [sell]
• !stock [tool] [qty]
• !broadcast [message]
• !scam [number] [reason]
• !top`;
}

function priceList(rates = []) {
  if (!rates.length) {
    return `📊 *Today's Price List*

Abhi rates collect nahi huay. Dealer groups se rates aate hi list update ho jayegi.`;
  }
  const lines = rates.slice(0, 25).map((r, i) => {
    const dealer = r.dealer_name ? ` - ${r.dealer_name}` : '';
    return `${i + 1}. *${r.tool_name} ${r.plan_name}* - ${formatMoney(r.buy_price)}${dealer}`;
  });
  return `📊 *Today's Best Prices*
━━━━━━━━━━━━━━━━
${lines.join('\n')}

Order ke liye: *order ChatGPT Plus* type karein.`;
}

function stockList(stock = []) {
  const available = stock.filter(row => Number(row.qty) > 0);
  if (!available.length) {
    return `📦 *Stock Update*

Abhi stock empty hai. Please price pooch lein ya admin se baat karein.`;
  }
  return `📦 *Available Stock*
━━━━━━━━━━━━━━━━
${available.map((s, i) => `${i + 1}. *${s.tool_name} ${s.plan_name}* - ${s.qty} available`).join('\n')}`;
}

function adminRates(rates = []) {
  if (!rates.length) return '📊 Aaj koi rate collect nahi hua.';
  return `📊 *Admin: Today's Collected Rates*

${rates.slice(0, 35).map((r, i) => `${i + 1}. ${r.tool_name} ${r.plan_name} - ${formatMoney(r.buy_price)} | ${r.dealer_number}`).join('\n')}`;
}

function profitResult(tool, buy, sell) {
  const profit = Number(sell) - Number(buy);
  const margin = Number(buy) ? (profit / Number(buy)) * 100 : 0;
  return `💰 *Profit Calculator*

Tool: ${tool || 'AI Tool'}
Buy: ${formatMoney(buy)}
Sell: ${formatMoney(sell)}
Profit: *${formatMoney(profit)}*
Margin: *${margin.toFixed(1)}%*`;
}

function orderCreated(order) {
  return `✅ *Order Created*

Order ID: #${order.id}
Tool: *${order.tool_name} ${order.plan_name}*
Qty: ${order.qty}
Status: ${order.status}

Payment screenshot bhej dein, admin delivery confirm karega.`;
}

function salesSummary(summary) {
  return `🌙 *Daily Sales Summary*

Orders: ${summary.orders || 0}
Revenue: ${formatMoney(summary.revenue || 0)}

Top tools:
${(summary.byTool || []).map((x, i) => `${i + 1}. ${x.tool_name} - ${x.qty} sold (${formatMoney(x.revenue)})`).join('\n') || 'No sales today'}`;
}

function lowStockAlert(rows = []) {
  if (!rows.length) return '';
  return `⚠️ *Low Stock Alert*

${rows.map(s => `• ${s.tool_name} ${s.plan_name}: ${s.qty} left`).join('\n')}`;
}

module.exports = {
  formatMoney,
  welcomeMenu,
  helpMenu,
  priceList,
  stockList,
  adminRates,
  profitResult,
  orderCreated,
  salesSummary,
  lowStockAlert
};
