const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WA_SEND_URL = process.env.WA_SEND_URL || 'http://127.0.0.1:3001/api/wa/send';
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '923001234567@c.us';
const TZ = 'Asia/Karachi';
let lastSignature = '';

function readJSON(file, fallback = []) {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    console.error(`[stockAlert] read ${file} failed:`, error.message);
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

function money(value) {
  const amount = Number(value || 0);
  return amount ? `Rs. ${amount.toLocaleString()}` : 'No price';
}

function productLine(product, index) {
  return `${index + 1}. ${product.name || 'Product'} - ${money(product.price)}${product.quantity !== undefined ? ` (qty: ${product.quantity})` : ''}`;
}

async function sendWhatsApp(text) {
  try {
    await axios.post(WA_SEND_URL, { number: normalizePhone(ADMIN_NUMBER), text }, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('[stockAlert] WhatsApp send failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkLowStock() {
  try {
    const products = readJSON('laptop_products.json', []);
    const outOfStock = products.filter(p => p && (p.stock === false || p.stock === 0));
    const lowStock = products.filter(p => {
      const qty = Number(p.quantity);
      return Number.isFinite(qty) && qty > 0 && qty <= 3 && p.stock !== false;
    });

    if (!outOfStock.length && !lowStock.length) {
      return { success: true, sent: false, outOfStock: 0, lowStock: 0 };
    }

    const signature = JSON.stringify({
      out: outOfStock.map(p => p.id || p.name).sort(),
      low: lowStock.map(p => `${p.id || p.name}:${p.quantity}`).sort()
    });
    if (signature === lastSignature) {
      return { success: true, sent: false, skippedDuplicate: true, outOfStock: outOfStock.length, lowStock: lowStock.length };
    }
    lastSignature = signature;

    const text = [
      '🚨 *Stock Alert*',
      '',
      outOfStock.length ? `❌ *Out of Stock (${outOfStock.length})*\n${outOfStock.slice(0, 12).map(productLine).join('\n')}` : '',
      lowStock.length ? `⚠️ *Low Stock (${lowStock.length})*\n${lowStock.slice(0, 12).map(productLine).join('\n')}` : '',
      '',
      'Please update stock in SuperSender Pro.'
    ].filter(Boolean).join('\n\n');

    const sent = await sendWhatsApp(text);
    return { success: sent, sent, outOfStock: outOfStock.length, lowStock: lowStock.length };
  } catch (error) {
    console.error('[stockAlert] check failed:', error.message);
    return { success: false, error: error.message };
  }
}

try {
  cron.schedule('0 */6 * * *', checkLowStock, { timezone: TZ });
  console.log('[Automation] Stock alert scheduled every 6 hours');
} catch (error) {
  console.error('[stockAlert] schedule failed:', error.message);
}

module.exports = { checkLowStock };
