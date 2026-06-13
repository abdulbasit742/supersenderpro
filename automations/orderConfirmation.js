const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WA_SEND_URL = process.env.WA_SEND_URL || 'http://127.0.0.1:3001/api/wa/send';
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '923001234567@c.us';

function readJSON(file, fallback = {}) {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    console.error(`[orderConfirmation] read ${file} failed:`, error.message);
    return fallback;
  }
}

function formatPhone(value) {
  try {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.includes('@')) return raw;
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
    return digits ? `${digits}@c.us` : '';
  } catch {
    return '';
  }
}

async function sendWhatsApp(number, text) {
  try {
    const to = formatPhone(number);
    if (!to || !text) return false;
    await axios.post(WA_SEND_URL, { number: to, text }, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('[orderConfirmation] WhatsApp send failed:', error.response?.data || error.message);
    return false;
  }
}

function paymentLines(settings = {}) {
  const lines = [];
  if (settings.easypaisa_number) lines.push(`EasyPaisa: ${settings.easypaisa_number}${settings.easypaisa_name ? ` (${settings.easypaisa_name})` : ''}`);
  if (settings.jazzcash_number) lines.push(`JazzCash: ${settings.jazzcash_number}${settings.jazzcash_name ? ` (${settings.jazzcash_name})` : ''}`);
  if (settings.nayapay_number) lines.push(`NayaPay: ${settings.nayapay_number}${settings.nayapay_name ? ` (${settings.nayapay_name})` : ''}`);
  if (settings.askari_account_number) lines.push(`Askari Bank: ${settings.askari_account_number}${settings.askari_account_name ? ` (${settings.askari_account_name})` : ''}`);
  if (settings.bank_iban) lines.push(`Bank IBAN: ${settings.bank_iban}${settings.bank_name ? ` (${settings.bank_name})` : ''}`);
  return lines.length ? lines.join('\n') : 'Payment details admin se confirm kar lein.';
}

function orderItemsText(order = {}) {
  try {
    if (order.productName) return order.productName;
    if (Array.isArray(order.items) && order.items.length) {
      return order.items.map(i => i.productName || i.name || i.title || i.product || 'Item').join(', ');
    }
    return 'Order item';
  } catch {
    return 'Order item';
  }
}

async function sendOrderConfirmation(order = {}) {
  try {
    const settings = readJSON('settings.json', {});
    const customerPhone = order.customerPhone || order.customerNumber || order.number || order.phone;
    const customerName = order.customerName || order.name || 'Customer';
    const productName = order.productName || orderItemsText(order);
    const amount = Number(order.amount || order.total || 0);
    const orderId = order.orderId || order.orderNumber || order.id || 'N/A';

    const customerText = [
      `Assalam o Alaikum ${customerName} 👋`,
      '',
      '✅ *Order Confirmed / Received*',
      `🧾 Order ID: *${orderId}*`,
      `📦 Product: *${productName}*`,
      `💰 Amount: *Rs. ${amount.toLocaleString()}*`,
      '',
      '🏦 *Payment Instructions:*',
      paymentLines(settings),
      '',
      'Payment screenshot bhej dein. Team aap se confirmation ke liye rabta karegi.'
    ].join('\n');

    const adminText = [
      '🛍️ *New Order Alert*',
      `🧾 Order ID: ${orderId}`,
      `👤 Customer: ${customerName}`,
      `📱 Phone: ${customerPhone || 'N/A'}`,
      `📦 Product: ${productName}`,
      `💰 Amount: Rs. ${amount.toLocaleString()}`
    ].join('\n');

    const customerSent = customerPhone ? await sendWhatsApp(customerPhone, customerText) : false;
    const adminSent = await sendWhatsApp(ADMIN_NUMBER, adminText);
    return { success: customerSent || adminSent, customerSent, adminSent };
  } catch (error) {
    console.error('[orderConfirmation] failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOrderConfirmation };
