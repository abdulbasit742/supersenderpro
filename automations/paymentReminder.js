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
    console.error(`[paymentReminder] read ${file} failed:`, error.message);
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

function paymentDate(payment = {}) {
  return payment.createdAt || payment.created || payment.date || payment.updated || payment.time;
}

function isOlderThan24Hours(value) {
  try {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return false;
    return Date.now() - time > 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

async function sendWhatsApp(number, text) {
  try {
    const to = formatPhone(number);
    if (!to || !text) return false;
    await axios.post(WA_SEND_URL, { number: to, text }, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('[paymentReminder] WhatsApp send failed:', error.response?.data || error.message);
    return false;
  }
}

function reminderText(payment = {}) {
  const amount = Number(payment.amount || 0);
  return [
    'Assalam o Alaikum 👋',
    '',
    'Ye aapki pending payment ki polite reminder hai.',
    `💰 Amount: *Rs. ${amount.toLocaleString()}*`,
    payment.method ? `🏦 Method: ${payment.method}` : '',
    payment.reference ? `🔖 Reference: ${payment.reference}` : '',
    payment.plan ? `📦 Plan/Product: ${payment.plan}` : '',
    '',
    'Payment complete ho gayi ho to receipt share kar dein. Shukriya.'
  ].filter(Boolean).join('\n');
}

async function sendPaymentReminders() {
  try {
    const payments = readJSON('payments.json', []);
    const pending = payments.filter(p =>
      String(p.status || '').toLowerCase() === 'pending' &&
      isOlderThan24Hours(paymentDate(p))
    );

    let sent = 0;
    const skipped = [];
    for (const payment of pending) {
      try {
        const phone = payment.customerPhone || payment.customerNumber || payment.number || payment.phone || payment.whatsapp;
        if (!phone) {
          skipped.push(payment.id || payment.reference || 'unknown');
          continue;
        }
        if (await sendWhatsApp(phone, reminderText(payment))) sent += 1;
      } catch (error) {
        console.error('[paymentReminder] customer reminder failed:', error.message);
      }
    }

    if (pending.length) {
      const total = pending.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const adminText = [
        '⏰ *Payment Reminder Summary*',
        `Pending >24h: *${pending.length}*`,
        `Messages sent: *${sent}*`,
        `Pending amount: *Rs. ${total.toLocaleString()}*`,
        skipped.length ? `Skipped missing phone: ${skipped.join(', ')}` : ''
      ].filter(Boolean).join('\n');
      await sendWhatsApp(ADMIN_NUMBER, adminText);
    }

    return { success: true, pending: pending.length, sent, skipped: skipped.length };
  } catch (error) {
    console.error('[paymentReminder] failed:', error.message);
    return { success: false, error: error.message };
  }
}

try {
  cron.schedule('0 11 * * *', sendPaymentReminders, { timezone: TZ });
  console.log('[Automation] Payment reminders scheduled for 11 AM PKT');
} catch (error) {
  console.error('[paymentReminder] schedule failed:', error.message);
}

module.exports = { sendPaymentReminders };
