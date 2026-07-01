// channelForwarder.js — forward messages from a source channel to target channels by rule.
//
// Previously this only console.log'd the intent and never actually forwarded anything. It now uses
// the live whatsapp-web.js client to really re-send the message to each target channel, carries
// media over when present, dedupes by (messageId, target), and records sent/failed in the log.

const fs = require('fs');
const path = require('path');

let MessageMedia = null;
try { ({ MessageMedia } = require('whatsapp-web.js')); } catch {}

const RULES_FILE = path.join(__dirname, '../data/channel_rules.json');
const FWD_FILE = path.join(__dirname, '../data/forwarded_ids.json');
const LOGS_FILE = path.join(__dirname, '../data/channel_logs.json');

let waClient = null;
function setWhatsAppClient(client) { waClient = client || null; }

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('Failed reading JSON', file, e);
    return fallback;
  }
}
function saveJson(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch (e) {
    console.error('Failed writing JSON', file, e);
  }
}

const rules = loadJson(RULES_FILE, {});
const forwarded = loadJson(FWD_FILE, {});
const logs = loadJson(LOGS_FILE, []);

async function resolveMedia(msg) {
  // If the incoming message carried media, try to reconstruct it for re-send.
  try {
    if (msg.mediaUrl && MessageMedia) return await MessageMedia.fromUrl(msg.mediaUrl, { unsafeMime: true });
    if (msg.mediaPath && MessageMedia) return MessageMedia.fromFilePath(msg.mediaPath);
    if (msg.hasMedia && typeof msg.downloadMedia === 'function') return await msg.downloadMedia();
  } catch (e) {
    console.warn('[channelForwarder] could not resolve media:', e.message);
  }
  return null;
}

/**
 * Forward a message to target channels based on channel_rules.json.
 * @param {Object} msg - Incoming message (needs `channelId`, `messageId`; optional body/media).
 * @returns {Promise<{forwarded:number, skipped:number, failed:number}>}
 */
async function forwardMessage(msg) {
  const src = msg.channelId;
  const result = { forwarded: 0, skipped: 0, failed: 0 };
  if (!src || !rules[src]) return result; // no forwarding rule for this source
  if (!waClient) {
    console.warn('[channelForwarder] WhatsApp client not connected; cannot forward');
    return result;
  }

  const targets = Array.isArray(rules[src]) ? rules[src] : [];
  const body = msg.body || msg.message || '';
  const media = await resolveMedia(msg);

  for (const targetId of targets) {
    const key = `${msg.messageId}-${targetId}`;
    if (forwarded[key]) { result.skipped++; continue; } // already forwarded
    try {
      if (media) await waClient.sendMessage(targetId, media, { caption: body });
      else await waClient.sendMessage(targetId, body);
      forwarded[key] = true;
      result.forwarded++;
      logs.push({ messageId: msg.messageId, from: src, to: targetId, status: 'sent', timestamp: new Date().toISOString() });
    } catch (err) {
      result.failed++;
      logs.push({ messageId: msg.messageId, from: src, to: targetId, status: 'failed', error: err.message, timestamp: new Date().toISOString() });
    }
  }

  saveJson(FWD_FILE, forwarded);
  saveJson(LOGS_FILE, logs.slice(-1000));
  return result;
}

module.exports = { setWhatsAppClient, forwardMessage };
