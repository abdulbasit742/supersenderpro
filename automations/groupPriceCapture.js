const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const PRICE_FILE = 'price_intel.json';
const PRODUCT_KEYWORDS = ['laptop', 'phone', 'iphone', 'samsung', 'dell', 'hp', 'macbook', 'plot', 'house'];

function readJSON(file, fallback) {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(value, null, 2));
  } catch {}
}

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : `gp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function detectProductKeyword(text = '') {
  const lower = String(text || '').toLowerCase();
  return PRODUCT_KEYWORDS.find(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(lower)) || '';
}

function parsePrice(text = '') {
  const raw = String(text || '').toLowerCase();
  const patterns = [
    /\b(?:rs\.?|pkr)\s*\.?\s*([\d,]+(?:\.\d+)?)\s*(k|lakh|lac|crore|cr)?\b/i,
    /\b([\d,]+(?:\.\d+)?)\s*(k|lakh|lac|crore|cr)\b/i,
    /\b([\d]{1,3}(?:,[\d]{3})+)\b/i,
    /\b([\d]{4,8})\b/i
  ];

  for (const re of patterns) {
    const match = raw.match(re);
    if (!match) continue;
    const amount = Number(String(match[1] || '').replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const unit = String(match[2] || '').toLowerCase();
    if (unit === 'k') return Math.round(amount * 1000);
    if (unit === 'lakh' || unit === 'lac') return Math.round(amount * 100000);
    if (unit === 'crore' || unit === 'cr') return Math.round(amount * 10000000);
    return Math.round(amount);
  }
  return 0;
}

async function readGroupMessageMeta(msg = {}) {
  let chat = null;
  let contact = null;
  try { if (typeof msg.getChat === 'function') chat = await msg.getChat(); } catch {}
  try { if (typeof msg.getContact === 'function') contact = await msg.getContact(); } catch {}
  const groupId = msg.from || chat?.id?._serialized || '';
  const senderId = msg.author || contact?.id?._serialized || '';
  const senderNumber = (contact?.number || contact?.id?.user || senderId || '').toString().replace(/\D/g, '');
  return {
    groupId,
    groupName: chat?.name || chat?.formattedTitle || groupId,
    senderNumber,
    senderName: contact?.pushname || contact?.name || senderNumber || 'Member',
    messageId: msg.id?._serialized || msg.id || '',
    timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString()
  };
}

function normalizeExistingEntry(entry = {}) {
  return {
    ...entry,
    timestamp: entry.timestamp || entry.date || entry.createdAt || new Date().toISOString(),
    productKeyword: entry.productKeyword || entry.product || entry.title || '',
    rawMessage: entry.rawMessage || entry.rawPost || ''
  };
}

async function processGroupMessage(msg = {}) {
  try {
    if (!msg?.from || !String(msg.from).endsWith('@g.us') || msg.fromMe) return null;
    const rawMessage = String(msg.body || msg.caption || '').trim();
    if (!rawMessage) return null;

    const productKeyword = detectProductKeyword(rawMessage);
    const price = parsePrice(rawMessage);
    if (!productKeyword || !price) return null;

    const meta = await readGroupMessageMeta(msg);
    const entries = readJSON(PRICE_FILE, []).map(normalizeExistingEntry);
    const duplicate = entries.some(entry => (
      (meta.messageId && entry.messageId === meta.messageId && Number(entry.price) === price && entry.productKeyword === productKeyword) ||
      (entry.groupId === meta.groupId && entry.senderNumber === meta.senderNumber && entry.rawMessage === rawMessage)
    ));
    if (duplicate) return null;

    const entry = {
      id: id(),
      groupId: meta.groupId,
      groupName: meta.groupName,
      senderNumber: meta.senderNumber,
      senderName: meta.senderName,
      productKeyword,
      product: productKeyword,
      price,
      currency: 'PKR',
      rawMessage,
      rawPost: rawMessage,
      messageId: meta.messageId,
      timestamp: meta.timestamp,
      date: meta.timestamp,
      source: 'group_regex'
    };

    entries.push(entry);
    writeJSON(PRICE_FILE, entries.slice(-500));
    return entry;
  } catch {
    return null;
  }
}

function getLatestPrices(limit = 20) {
  try {
    const rows = readJSON(PRICE_FILE, []).map(normalizeExistingEntry);
    return rows
      .sort((a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0))
      .slice(0, Math.max(1, Number(limit || 20)));
  } catch {
    return [];
  }
}

function getGroupPriceStats(groupId = '') {
  try {
    const wanted = String(groupId || '').trim();
    const rows = readJSON(PRICE_FILE, []).map(normalizeExistingEntry)
      .filter(row => !wanted || row.groupId === wanted || row.groupName === wanted);
    const map = new Map();
    for (const row of rows) {
      const product = row.productKeyword || row.product || row.title || 'unknown';
      const price = Number(row.price || 0);
      if (!price) continue;
      if (!map.has(product)) map.set(product, []);
      map.get(product).push(price);
    }
    return [...map.entries()].map(([product, prices]) => ({
      product,
      count: prices.length,
      avg: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices)
    }));
  } catch {
    return [];
  }
}

function deleteGroupPrice(idToDelete) {
  try {
    const before = readJSON(PRICE_FILE, []);
    const after = before.filter(entry => entry.id !== idToDelete);
    writeJSON(PRICE_FILE, after);
    return { success: true, removed: before.length - after.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  processGroupMessage,
  getGroupPriceStats,
  getLatestPrices,
  deleteGroupPrice
};
