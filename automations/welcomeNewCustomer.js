const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WA_SEND_URL = process.env.WA_SEND_URL || 'http://127.0.0.1:3001/api/wa/send';
const pendingFollowUps = new Map();

function readJSON(file, fallback = []) {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    console.error(`[welcomeNewCustomer] read ${file} failed:`, error.message);
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

function topProducts() {
  try {
    return readJSON('laptop_products.json', [])
      .filter(p => p && p.stock !== false && Number(p.price || 0) > 0)
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      .slice(0, 3);
  } catch (error) {
    console.error('[welcomeNewCustomer] top products failed:', error.message);
    return [];
  }
}

function productPreview(products = []) {
  try {
    if (!products.length) return '💻 Latest products available hain. Budget/model bhej dein.';
    return products.map((p, i) => {
      const price = Number(p.price || 0);
      return `${i + 1}. *${p.name || 'Product'}*\n   💰 Rs. ${price.toLocaleString()}`;
    }).join('\n');
  } catch {
    return '';
  }
}

async function sendToWhatsApp(number, text) {
  try {
    const to = formatPhone(number);
    if (!to || !text) return false;
    await axios.post(WA_SEND_URL, { number: to, text }, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('[welcomeNewCustomer] WhatsApp send failed:', error.response?.data || error.message);
    return false;
  }
}

async function sendWelcomeMessage(customer = {}) {
  try {
    const phone = customer.phone || customer.number || customer.whatsapp || customer.customerNumber;
    const name = customer.name || customer.customerName || 'friend';
    const products = topProducts();
    const text = [
      `Assalam o Alaikum ${name}! 👋`,
      '',
      '🛍️ *Welcome to Infinity Touch Store*',
      '',
      'Hum provide karte hain:',
      '✅ AI Tools Subscriptions',
      '✅ Laptops - Best Prices',
      '✅ Scholarships 2026 Finder',
      '',
      '🔥 *Top Products:*',
      productPreview(products),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '1️⃣ AI Tools',
      '2️⃣ Laptops',
      '3️⃣ Scholarship Finder',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Bas 1, 2 ya 3 type karein 😊'
    ].join('\n');
    return await sendToWhatsApp(phone, text);
  } catch (error) {
    console.error('[welcomeNewCustomer] welcome failed:', error.message);
    return false;
  }
}

function cancelFollowUp(userId) {
  try {
    const key = String(userId || '');
    const timer = pendingFollowUps.get(key);
    if (timer) clearTimeout(timer);
    pendingFollowUps.delete(key);
    return true;
  } catch (error) {
    console.error('[welcomeNewCustomer] cancel follow-up failed:', error.message);
    return false;
  }
}

function scheduleFollowUp(userId, lastMessage = '') {
  try {
    const key = String(userId || '');
    if (!key) return false;
    cancelFollowUp(key);
    const timer = setTimeout(async () => {
      try {
        const text = [
          '👋 Aapki query ke hawale se follow-up:',
          lastMessage ? `_${String(lastMessage).slice(0, 300)}_` : '',
          '',
          'Kya aapko abhi bhi help chahiye? Budget/model ya plan bata dein, main guide kar deta hoon.'
        ].filter(Boolean).join('\n');
        await sendToWhatsApp(key, text);
      } catch (error) {
        console.error('[welcomeNewCustomer] follow-up send failed:', error.message);
      } finally {
        pendingFollowUps.delete(key);
      }
    }, 60 * 60 * 1000);
    if (timer.unref) timer.unref();
    pendingFollowUps.set(key, timer);
    return true;
  } catch (error) {
    console.error('[welcomeNewCustomer] schedule follow-up failed:', error.message);
    return false;
  }
}

module.exports = { sendWelcomeMessage, scheduleFollowUp, cancelFollowUp };
