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
    console.error(`[weeklyReport] read ${file} failed:`, error.message);
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

function recordDate(record = {}) {
  return record.date || record.createdAt || record.created || record.created_at || record.updated || record.time;
}

function inRange(record, start, end) {
  try {
    const t = new Date(recordDate(record)).getTime();
    return Number.isFinite(t) && t >= start && t < end;
  } catch {
    return false;
  }
}

function isPaid(record = {}) {
  return ['approved', 'paid', 'success', 'completed', 'confirmed'].includes(String(record.status || '').toLowerCase());
}

function sumRevenue(payments, start, end) {
  return payments.filter(p => isPaid(p) && inRange(p, start, end)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

function mostCommon(values = []) {
  try {
    const counts = new Map();
    values.filter(Boolean).forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  } catch {
    return 'N/A';
  }
}

function topProduct(orders = []) {
  try {
    const names = [];
    for (const order of orders) {
      if (Array.isArray(order.items)) {
        order.items.forEach(item => names.push(item.productName || item.name || item.title || item.product));
      } else {
        names.push(order.productName || order.plan || order.product);
      }
    }
    return mostCommon(names);
  } catch {
    return 'N/A';
  }
}

async function sendWhatsApp(text) {
  try {
    await axios.post(WA_SEND_URL, { number: normalizePhone(ADMIN_NUMBER), text }, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('[weeklyReport] WhatsApp send failed:', error.response?.data || error.message);
    return false;
  }
}

async function sendWeeklyReport() {
  try {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    const prevStart = now - 14 * 24 * 60 * 60 * 1000;
    const payments = readJSON('payments.json', []);
    const customers = readJSON('customers.json', []);
    const orders = readJSON('orders.json', []);

    const weekPayments = payments.filter(p => inRange(p, weekStart, now));
    const weekPaid = weekPayments.filter(isPaid);
    const weekOrders = orders.filter(o => inRange(o, weekStart, now));
    const prevOrders = orders.filter(o => inRange(o, prevStart, weekStart));
    const newCustomers = customers.filter(c => inRange(c, weekStart, now));

    const revenue = sumRevenue(payments, weekStart, now);
    const previousRevenue = sumRevenue(payments, prevStart, weekStart);
    const revenueDelta = revenue - previousRevenue;
    const method = mostCommon(weekPaid.map(p => p.method));
    const product = topProduct(weekOrders);

    const text = [
      '📈 *Weekly Business Report*',
      'Period: Last 7 days',
      '',
      `💰 Revenue: *Rs. ${revenue.toLocaleString()}*`,
      `📊 Vs previous week: ${revenueDelta >= 0 ? '+' : ''}Rs. ${revenueDelta.toLocaleString()}`,
      `👥 New Customers: *${newCustomers.length}*`,
      `🛍️ Orders: *${weekOrders.length}* (${prevOrders.length} previous week)`,
      `🏆 Top Product: *${product}*`,
      `🏦 Best Payment Method: *${method}*`,
      '',
      'SuperSender Pro weekly automation'
    ].join('\n');

    const sent = await sendWhatsApp(text);
    return { success: sent, revenue, previousRevenue, newCustomers: newCustomers.length, orders: weekOrders.length, topProduct: product, bestPaymentMethod: method };
  } catch (error) {
    console.error('[weeklyReport] failed:', error.message);
    return { success: false, error: error.message };
  }
}

try {
  cron.schedule('0 9 * * 1', sendWeeklyReport, { timezone: TZ });
  console.log('[Automation] Weekly report scheduled for Monday 9 AM PKT');
} catch (error) {
  console.error('[weeklyReport] schedule failed:', error.message);
}

module.exports = { sendWeeklyReport };
