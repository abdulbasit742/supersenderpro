const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WA_SEND_URL = process.env.WA_SEND_URL || 'http://127.0.0.1:3001/api/wa/send';
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '923001234567@c.us';
const TZ = 'Asia/Karachi';

function readJSON(file, fallback = []) {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    console.error(`[dailySalesReport] read ${file} failed:`, error.message);
    return fallback;
  }
}

function normalizePhone(value) {
  try {
    const raw = String(value || ADMIN_NUMBER).trim();
    if (raw.includes('@')) return raw;
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
    return `${digits}@c.us`;
  } catch {
    return ADMIN_NUMBER;
  }
}

function dayKey(value = new Date()) {
  try {
    const date = value instanceof Date ? value : new Date(value);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return '';
  }
}

function recordDate(record = {}) {
  return record.date || record.createdAt || record.created || record.created_at || record.updated || record.time;
}

function amountOf(record = {}) {
  const amount = Number(record.amount ?? record.total ?? record.price ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function isPaid(record = {}) {
  return ['approved', 'paid', 'success', 'completed', 'confirmed'].includes(String(record.status || '').toLowerCase());
}

function isPending(record = {}) {
  return ['pending', 'unpaid', 'due', 'partial'].includes(String(record.status || '').toLowerCase());
}

async function sendWhatsApp(text) {
  try {
    await axios.post(WA_SEND_URL, { number: normalizePhone(ADMIN_NUMBER), text }, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('[dailySalesReport] WhatsApp send failed:', error.response?.data || error.message);
    return false;
  }
}

async function sendDailySalesReport() {
  try {
    const today = dayKey();
    const payments = readJSON('payments.json', []);
    const customers = readJSON('customers.json', []);
    const orders = readJSON('orders.json', []);

    const todayPayments = payments.filter(p => dayKey(recordDate(p)) === today);
    const paidToday = todayPayments.filter(isPaid);
    const pendingPayments = payments.filter(isPending);
    const newCustomers = customers.filter(c => dayKey(recordDate(c)) === today);
    const todayOrders = orders.filter(o => dayKey(recordDate(o)) === today);

    const revenue = paidToday.reduce((sum, p) => sum + amountOf(p), 0);
    const pending = pendingPayments.reduce((sum, p) => sum + amountOf(p), 0);

    const text = [
      '📊 *Daily Sales Report*',
      `📅 Date: ${today} (Pakistan)`,
      '',
      `💰 Today's Revenue: *Rs. ${revenue.toLocaleString()}*`,
      `⏳ Pending Amount: *Rs. ${pending.toLocaleString()}*`,
      `👥 New Customers: *${newCustomers.length}*`,
      `🛍️ Orders Today: *${todayOrders.length}*`,
      `✅ Paid Payments: *${paidToday.length}*`,
      '',
      'SuperSender Pro auto report'
    ].join('\n');

    const sent = await sendWhatsApp(text);
    return { success: sent, revenue, pending, newCustomers: newCustomers.length, orders: todayOrders.length };
  } catch (error) {
    console.error('[dailySalesReport] failed:', error.message);
    return { success: false, error: error.message };
  }
}

try {
  cron.schedule('0 22 * * *', sendDailySalesReport, { timezone: TZ });
  console.log('[Automation] Daily sales report scheduled for 10 PM PKT');
} catch (error) {
  console.error('[dailySalesReport] schedule failed:', error.message);
}

module.exports = { sendDailySalesReport };
