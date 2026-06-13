const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let MessageMedia = null;
try {
  ({ MessageMedia } = require('whatsapp-web.js'));
} catch {}

const DATA_DIR = path.join(__dirname, '../data');
const RULES_FILE = path.join(DATA_DIR, 'group_autoreplies.json');
const LOG_FILE = path.join(DATA_DIR, 'group_reply_log.json');
const cooldowns = new Map();

const DEFAULT_RULES = [
  {
    id: 'gr1',
    groupId: 'all',
    keyword: 'price',
    matchType: 'contains',
    reply: '💰 Prices check karne ke liye: wa.me/923326550431',
    active: true,
    cooldownMinutes: 5
  },
  {
    id: 'gr2',
    groupId: 'all',
    keyword: 'rate',
    matchType: 'contains',
    reply: '📊 Current rates ke liye directly contact karein: 0332-6550431',
    active: true,
    cooldownMinutes: 5
  }
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

function ensureDefaultRules() {
  const rules = readJSON(RULES_FILE, null);
  if (Array.isArray(rules) && rules.length) return rules;
  writeJSON(RULES_FILE, DEFAULT_RULES);
  return DEFAULT_RULES;
}

function newId(prefix) {
  return crypto.randomUUID ? crypto.randomUUID() : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeRule(rule = {}) {
  return {
    id: rule.id || newId('gr'),
    groupId: rule.groupId || 'all',
    keyword: String(rule.keyword || '').trim(),
    matchType: ['exact', 'contains', 'startsWith'].includes(rule.matchType) ? rule.matchType : 'contains',
    reply: String(rule.reply || '').trim(),
    mediaUrl: rule.mediaUrl || '',
    active: rule.active !== false,
    cooldownMinutes: Number(rule.cooldownMinutes || 5)
  };
}

function matchesRule(text, rule) {
  const lower = String(text || '').toLowerCase().trim();
  const keyword = String(rule.keyword || '').toLowerCase().trim();
  if (!keyword) return false;
  if (rule.matchType === 'exact') return lower === keyword;
  if (rule.matchType === 'startsWith') return lower.startsWith(keyword);
  return lower.includes(keyword);
}

function canTrigger(rule, groupId) {
  const key = `${groupId}:${rule.id}`;
  const last = cooldowns.get(key) || 0;
  const waitMs = Math.max(0, Number(rule.cooldownMinutes || 0)) * 60 * 1000;
  if (waitMs && Date.now() - last < waitMs) return false;
  cooldowns.set(key, Date.now());
  return true;
}

function logReply(entry) {
  const rows = readJSON(LOG_FILE, []);
  rows.push({
    id: entry.id || newId('grlog'),
    ruleId: entry.ruleId || '',
    groupId: entry.groupId || '',
    keyword: entry.keyword || '',
    reply: entry.reply || '',
    status: entry.status || 'sent',
    error: entry.error || '',
    timestamp: new Date().toISOString()
  });
  writeJSON(LOG_FILE, rows.slice(-500));
}

async function sendMediaReply(msg, rule) {
  if (!rule.mediaUrl || !MessageMedia || !msg?.client?.sendMessage) return false;
  const media = /^https?:\/\//i.test(rule.mediaUrl)
    ? await MessageMedia.fromUrl(rule.mediaUrl, { unsafeMime: true })
    : MessageMedia.fromFilePath(rule.mediaUrl);
  await msg.client.sendMessage(msg.from, media, { caption: rule.reply || '' });
  return true;
}

async function checkGroupAutoReply(msg = {}) {
  try {
    const groupId = String(msg.from || '');
    if (!groupId.endsWith('@g.us') || msg.fromMe) return null;
    const text = String(msg.body || msg.caption || '').trim();
    if (!text) return null;

    const rules = ensureDefaultRules()
      .map(normalizeRule)
      .filter(rule => rule.active && (rule.groupId === 'all' || rule.groupId === groupId));

    const rule = rules.find(item => matchesRule(text, item));
    if (!rule || !canTrigger(rule, groupId)) return null;

    try {
      const mediaSent = await sendMediaReply(msg, rule);
      if (!mediaSent && typeof msg.reply === 'function') await msg.reply(rule.reply);
      logReply({ ruleId: rule.id, groupId, keyword: rule.keyword, reply: rule.reply, status: 'sent' });
      return rule;
    } catch (error) {
      logReply({ ruleId: rule.id, groupId, keyword: rule.keyword, reply: rule.reply, status: 'failed', error: error.message });
      return null;
    }
  } catch {
    return null;
  }
}

function getGroupAutoReplies(groupId = '') {
  const wanted = String(groupId || '').trim();
  const rules = ensureDefaultRules().map(normalizeRule);
  return wanted ? rules.filter(rule => rule.groupId === wanted || rule.groupId === 'all') : rules;
}

function addGroupAutoReply(rule) {
  try {
    const rules = ensureDefaultRules().map(normalizeRule);
    const next = normalizeRule(rule);
    rules.push(next);
    writeJSON(RULES_FILE, rules);
    return { success: true, rule: next };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function updateGroupAutoReply(id, patch = {}) {
  try {
    const rules = ensureDefaultRules().map(normalizeRule);
    const index = rules.findIndex(rule => rule.id === id);
    if (index === -1) return { success: false, error: 'rule not found' };
    rules[index] = normalizeRule({ ...rules[index], ...patch, id });
    writeJSON(RULES_FILE, rules);
    return { success: true, rule: rules[index] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function toggleGroupAutoReply(id, active) {
  return updateGroupAutoReply(id, { active: active !== false });
}

function deleteGroupAutoReply(id) {
  try {
    const rules = ensureDefaultRules().map(normalizeRule);
    const next = rules.filter(rule => rule.id !== id);
    writeJSON(RULES_FILE, next);
    return { success: true, removed: rules.length - next.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  DEFAULT_RULES,
  checkGroupAutoReply,
  addGroupAutoReply,
  getGroupAutoReplies,
  toggleGroupAutoReply,
  updateGroupAutoReply,
  deleteGroupAutoReply
};
