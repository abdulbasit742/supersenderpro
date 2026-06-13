const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'group_analytics.json');
const HOT_SIGNALS_FILE = path.join(DATA_DIR, 'hot_signals.json');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'hai', 'hain', 'main', 'mein', 'kya',
  'this', 'that', 'with', 'from', 'aur', 'bhi', 'ko', 'ka', 'ki', 'ke', 'to',
  'in', 'on', 'of', 'is', 'are', 'a', 'an'
]);

const BUYING_KEYWORDS = [
  'chahiye', 'need', 'want', 'buy', 'kharidna', 'price?', 'rate?', 'available?',
  'stock?', 'kaisa milega', 'contact', 'kitna', 'rate', 'price', 'available',
  'order', 'lena hai'
];

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch {}
}

function newId(prefix) {
  return crypto.randomUUID ? crypto.randomUUID() : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function getMessageMeta(msg = {}) {
  let chat = null;
  let contact = null;
  try { if (typeof msg.getChat === 'function') chat = await msg.getChat(); } catch {}
  try { if (typeof msg.getContact === 'function') contact = await msg.getContact(); } catch {}
  const groupId = msg.from || chat?.id?._serialized || '';
  const senderId = msg.author || contact?.id?._serialized || '';
  const senderNumber = (msg.senderNumber || contact?.number || contact?.id?.user || senderId || '').toString().replace(/\D/g, '');
  return {
    groupId,
    groupName: msg.groupName || chat?.name || chat?.formattedTitle || groupId || 'Group',
    sender: senderId,
    senderNumber,
    senderName: msg.senderName || contact?.pushname || contact?.name || senderNumber || 'Member',
    message: String(msg.body || msg.caption || '').trim(),
    timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString()
  };
}

function wordsFrom(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

async function trackGroupActivity(msg = {}) {
  try {
    if (!String(msg.from || '').endsWith('@g.us') || msg.fromMe) return null;
    const meta = await getMessageMeta(msg);
    const data = readJSON(ANALYTICS_FILE, {});
    const group = data[meta.groupId] || {
      groupId: meta.groupId,
      groupName: meta.groupName,
      members: {},
      keywords: {},
      hourlyActivity: {},
      messageCount: 0,
      lastActivity: null
    };

    group.groupName = meta.groupName || group.groupName;
    group.messageCount = Number(group.messageCount || 0) + 1;
    group.lastActivity = meta.timestamp;

    const memberKey = meta.senderNumber || meta.sender || 'unknown';
    group.members[memberKey] = group.members[memberKey] || {
      name: meta.senderName,
      messageCount: 0,
      lastSeen: null
    };
    group.members[memberKey].name = meta.senderName || group.members[memberKey].name;
    group.members[memberKey].messageCount += 1;
    group.members[memberKey].lastSeen = meta.timestamp;

    const hour = String(new Date(meta.timestamp).getHours());
    group.hourlyActivity[hour] = Number(group.hourlyActivity[hour] || 0) + 1;

    for (const word of wordsFrom(meta.message).slice(0, 30)) {
      group.keywords[word] = Number(group.keywords[word] || 0) + 1;
    }

    data[meta.groupId] = group;
    writeJSON(ANALYTICS_FILE, data);
    return group;
  } catch {
    return null;
  }
}

async function detectBuyingSignal(msg = {}) {
  try {
    if (!String(msg.from || '').endsWith('@g.us') || msg.fromMe) {
      return { isBuyingSignal: false, keyword: '', confidence: 0 };
    }
    const meta = await getMessageMeta(msg);
    const lower = meta.message.toLowerCase();
    const keyword = BUYING_KEYWORDS.find(item => lower.includes(item.toLowerCase()));
    if (!keyword) return { isBuyingSignal: false, keyword: '', confidence: 0 };

    const rows = readJSON(HOT_SIGNALS_FILE, []);
    const duplicate = rows.some(row => (
      row.groupId === meta.groupId &&
      row.senderNumber === meta.senderNumber &&
      row.message === meta.message &&
      Date.now() - Date.parse(row.timestamp || 0) < 60 * 60 * 1000
    ));
    if (!duplicate) {
      rows.push({
        id: newId('hs'),
        sender: meta.sender,
        senderNumber: meta.senderNumber,
        senderName: meta.senderName,
        group: meta.groupName,
        groupId: meta.groupId,
        message: meta.message,
        keyword,
        confidence: ['price?', 'rate?', 'available?', 'stock?'].includes(keyword) ? 0.92 : 0.78,
        timestamp: meta.timestamp,
        status: 'new'
      });
      writeJSON(HOT_SIGNALS_FILE, rows.slice(-1000));
    }
    return { isBuyingSignal: true, keyword, confidence: 0.8 };
  } catch {
    return { isBuyingSignal: false, keyword: '', confidence: 0 };
  }
}

function getHotSignals(status = 'new') {
  try {
    const wanted = String(status || 'new').toLowerCase();
    const rows = readJSON(HOT_SIGNALS_FILE, []);
    return rows
      .filter(row => wanted === 'all' || String(row.status || 'new').toLowerCase() === wanted)
      .sort((a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0));
  } catch {
    return [];
  }
}

function markSignalContacted(id, status = 'contacted') {
  try {
    const rows = readJSON(HOT_SIGNALS_FILE, []);
    const row = rows.find(item => item.id === id);
    if (!row) return { success: false, error: 'signal not found' };
    row.status = status || 'contacted';
    row.updatedAt = new Date().toISOString();
    writeJSON(HOT_SIGNALS_FILE, rows);
    return { success: true, signal: row };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getGroupStats(groupId) {
  const data = readJSON(ANALYTICS_FILE, {});
  return data[groupId] || null;
}

function getTopGroups(limit = 10) {
  try {
    const data = readJSON(ANALYTICS_FILE, {});
    return Object.values(data)
      .sort((a, b) => Number(b.messageCount || 0) - Number(a.messageCount || 0))
      .slice(0, Math.max(1, Number(limit || 10)));
  } catch {
    return [];
  }
}

function getAnalyticsSummary() {
  const data = readJSON(ANALYTICS_FILE, {});
  const groups = Object.values(data);
  const today = new Date().toISOString().slice(0, 10);
  const hotToday = getHotSignals('all').filter(row => String(row.timestamp || '').startsWith(today)).length;
  return {
    totalGroups: groups.length,
    activeGroups: groups.filter(group => group.lastActivity).length,
    hotSignalsToday: hotToday,
    messagesCaptured: groups.reduce((sum, group) => sum + Number(group.messageCount || 0), 0),
    groups
  };
}

module.exports = {
  trackGroupActivity,
  detectBuyingSignal,
  getHotSignals,
  markSignalContacted,
  getGroupStats,
  getTopGroups,
  getAnalyticsSummary
};
