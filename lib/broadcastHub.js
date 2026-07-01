'use strict';
/**
 * broadcastHub.js — ONE-CLICK broadcast to everything.
 *
 * Sends a single message (text and/or media) to any combination of:
 *   - individual chats   (1:1 contacts)
 *   - groups             (@g.us)
 *   - channels           (WhatsApp Channels / newsletters, @newsletter)
 *
 * Design goals:
 *   - One call: sendToAll({ message, mediaPath, targets }) does the whole fan-out.
 *   - Safe: a per-recipient delay throttles sends so the WhatsApp account is less likely to get
 *     flagged/banned. One failed recipient never aborts the rest.
 *   - Honest: if the WA client isn't connected we fail loudly instead of pretending success.
 *   - Reuses the SAME whatsapp-web.js client the rest of the app already uses (set via
 *     setWhatsAppClient), so there's a single source of truth for the session.
 */

const fs = require('fs');
const path = require('path');

let MessageMedia = null;
try { ({ MessageMedia } = require('whatsapp-web.js')); } catch {}

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'broadcast_hub_log.json');

// Throttle between sends (ms). Override with BROADCAST_DELAY_MS. Default 3s mirrors groupBroadcast.
const SEND_DELAY_MS = Number(process.env.BROADCAST_DELAY_MS || 3000);

let waClient = null;
function setWhatsAppClient(client) { waClient = client || null; }
function ensureClient() {
  if (!waClient) throw new Error('WhatsApp client is not connected');
  return waClient;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeJSON(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch { /* best-effort */ }
}

function logRun(entry) {
  const rows = readJSON(LOG_FILE, []);
  rows.push({
    id: `bh_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    ...entry
  });
  writeJSON(LOG_FILE, rows.slice(-500));
}

async function mediaFromPath(mediaPath) {
  if (!mediaPath || !MessageMedia) return null;
  if (/^https?:\/\//i.test(mediaPath)) return MessageMedia.fromUrl(mediaPath, { unsafeMime: true });
  return MessageMedia.fromFilePath(mediaPath);
}

// ---------------------------------------------------------------------------
// Target discovery
// ---------------------------------------------------------------------------
// Classify a chat into 'channel' | 'group' | 'chat'. whatsapp-web.js marks Channels/newsletters
// with an id ending in @newsletter (and/or chat.isChannel/isNewsletter on newer builds).
function classify(chat) {
  const id = chat?.id?._serialized || chat?.id || '';
  if (chat?.isChannel || chat?.isNewsletter || /@newsletter$/.test(id)) return 'channel';
  if (chat?.isGroup || /@g\.us$/.test(id)) return 'group';
  return 'chat';
}

/**
 * List all reachable targets, grouped by kind. Use this to populate the UI's
 * "who do you want to send to" picker, and to power "send to everything".
 */
async function listTargets() {
  const client = ensureClient();
  const chats = (await client.getChats()) || [];
  const out = { chats: [], groups: [], channels: [] };
  for (const chat of chats) {
    const id = chat?.id?._serialized || chat?.id || '';
    if (!id) continue;
    const item = {
      id,
      name: chat.name || chat.formattedTitle || chat.pushname || id,
      memberCount: Array.isArray(chat.participants) ? chat.participants.length : undefined
    };
    const kind = classify(chat);
    if (kind === 'channel') out.channels.push(item);
    else if (kind === 'group') out.groups.push(item);
    else out.chats.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------
async function sendOne(targetId, message, media) {
  const client = ensureClient();
  if (media) await client.sendMessage(targetId, media, { caption: message || '' });
  else await client.sendMessage(targetId, message);
  return { success: true, id: targetId };
}

/**
 * Resolve which target ids to send to.
 * @param {Object} targets
 *   targets.all      => send to every chat + group + channel
 *   targets.kinds    => array subset of ['chats','groups','channels'] to send to all of those
 *   targets.ids      => explicit array of recipient ids (mixed kinds allowed)
 */
async function resolveTargetIds(targets = {}) {
  if (Array.isArray(targets.ids) && targets.ids.length) {
    return targets.ids.slice();
  }
  const discovered = await listTargets();
  const kinds = targets.all
    ? ['chats', 'groups', 'channels']
    : (Array.isArray(targets.kinds) && targets.kinds.length ? targets.kinds : ['groups']);
  const ids = [];
  for (const kind of kinds) {
    for (const item of (discovered[kind] || [])) ids.push(item.id);
  }
  return ids;
}

/**
 * ONE-CLICK broadcast. Sends `message` (+ optional media) to the resolved targets.
 * Returns { sent, failed, total } and logs the run. Never throws on per-recipient errors.
 *
 * @param {Object} opts
 * @param {string} opts.message      text body / caption
 * @param {string} [opts.mediaPath]  local path or http(s) url to an image/video/doc
 * @param {Object} [opts.targets]    see resolveTargetIds (defaults to all groups)
 * @param {number} [opts.delayMs]    per-recipient throttle (defaults to SEND_DELAY_MS)
 */
async function sendToAll(opts = {}) {
  const { message = '', mediaPath = null, targets = { kinds: ['groups'] } } = opts;
  if (!message && !mediaPath) throw new Error('message or mediaPath is required');
  ensureClient(); // fail fast if not connected

  const delayMs = Number.isFinite(opts.delayMs) ? opts.delayMs : SEND_DELAY_MS;
  const ids = await resolveTargetIds(targets);
  const media = await mediaFromPath(mediaPath);

  const sent = [];
  const failed = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      await sendOne(id, message, media);
      sent.push(id);
    } catch (err) {
      failed.push({ id, error: err.message });
    }
    if (i < ids.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  const summary = { total: ids.length, sent: sent.length, failed: failed.length };
  logRun({ ...summary, message: message.slice(0, 200), hadMedia: !!media, failedDetail: failed.slice(0, 50) });
  return { ...summary, sentIds: sent, failed };
}

function getBroadcastLog(limit = 50) {
  const rows = readJSON(LOG_FILE, []);
  return rows.slice(-Math.max(1, Number(limit || 50))).reverse();
}

module.exports = {
  setWhatsAppClient,
  listTargets,
  sendToAll,
  getBroadcastLog
};
