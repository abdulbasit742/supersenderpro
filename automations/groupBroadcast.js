const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

let MessageMedia = null;
try {
  ({ MessageMedia } = require('whatsapp-web.js'));
} catch {}

const DATA_DIR = path.join(__dirname, '../data');
const LOG_FILE = path.join(DATA_DIR, 'group_broadcast_log.json');
const scheduledJobs = new Map();
let waClient = null;

function setWhatsAppClient(client) {
  waClient = client || null;
}

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

function logBroadcast(entry) {
  const rows = readJSON(LOG_FILE, []);
  rows.push({
    id: entry.id || `gb_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    groupId: entry.groupId || '',
    groupName: entry.groupName || '',
    message: entry.message || '',
    mediaPath: entry.mediaPath || null,
    sentAt: entry.sentAt || new Date().toISOString(),
    status: entry.status || 'sent',
    error: entry.error || ''
  });
  writeJSON(LOG_FILE, rows.slice(-500));
}

function ensureClient() {
  if (!waClient) throw new Error('WhatsApp client is not connected');
  return waClient;
}

async function mediaFromPath(mediaPath) {
  if (!mediaPath || !MessageMedia) return null;
  if (/^https?:\/\//i.test(mediaPath)) return MessageMedia.fromUrl(mediaPath, { unsafeMime: true });
  return MessageMedia.fromFilePath(mediaPath);
}

async function sendGroupAnnouncement(groupId, message, mediaPath = null) {
  try {
    if (!groupId) throw new Error('groupId is required');
    if (!message && !mediaPath) throw new Error('message or mediaPath is required');
    const client = ensureClient();
    const target = String(groupId).endsWith('@g.us') ? String(groupId) : `${groupId}@g.us`;
    const media = await mediaFromPath(mediaPath);
    if (media) await client.sendMessage(target, media, { caption: message || '' });
    else await client.sendMessage(target, message);
    logBroadcast({ groupId: target, message, mediaPath, status: 'sent' });
    return { success: true, groupId: target };
  } catch (error) {
    logBroadcast({ groupId, message, mediaPath, status: 'failed', error: error.message });
    return { success: false, groupId, error: error.message };
  }
}

async function getAllGroups() {
  const client = ensureClient();
  const chats = await client.getChats();
  return (chats || []).filter(chat => chat?.isGroup).map(chat => ({
    id: chat.id?._serialized || chat.id || '',
    name: chat.name || chat.formattedTitle || 'Group',
    memberCount: Array.isArray(chat.participants) ? chat.participants.length : 0
  })).filter(group => group.id);
}

async function sendToAllGroups(message, mediaPath = null) {
  const sent = [];
  const failed = [];
  try {
    const groups = await getAllGroups();
    for (const group of groups) {
      const result = await sendGroupAnnouncement(group.id, message, mediaPath);
      if (result.success) sent.push(group);
      else failed.push({ ...group, error: result.error });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } catch (error) {
    failed.push({ groupId: 'all', error: error.message });
  }
  return { sent, failed };
}

function scheduleGroupBroadcast(groupId, message, cronTime) {
  try {
    if (!cron.validate(cronTime)) throw new Error('Invalid cronTime');
    const id = `schedule_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const job = cron.schedule(cronTime, () => {
      sendGroupAnnouncement(groupId, message).catch(() => {});
    }, { timezone: 'Asia/Karachi' });
    scheduledJobs.set(id, { id, groupId, message, cronTime, job, createdAt: new Date().toISOString() });
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getGroupBroadcastLog(limit = 50) {
  const rows = readJSON(LOG_FILE, []);
  return rows.slice(-Math.max(1, Number(limit || 50))).reverse();
}

function getScheduledBroadcasts() {
  return [...scheduledJobs.values()].map(({ job, ...item }) => item);
}

module.exports = {
  setWhatsAppClient,
  sendGroupAnnouncement,
  sendToAllGroups,
  scheduleGroupBroadcast,
  getGroupBroadcastLog,
  getScheduledBroadcasts,
  getAllGroups
};
