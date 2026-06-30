'use strict';
/**
 * cloudApiWebhook.js — Inbound Feature #2: official WhatsApp Cloud API webhook.
 *
 * The inbound router (#inbound1) handles messages from whatsapp-web.js. This adds the OFFICIAL
 * WhatsApp Cloud API path: Meta sends webhooks here. We do the GET verification handshake and parse
 * POST payloads into the SAME normalized shape ({ phone, text, name }) the router expects, so both
 * engines (unofficial + official) feed one pipeline.
 *
 * Pure parsing + verification; the actual handling is delegated to an injected handler (the message
 * router). Verify token + app secret come from env.
 */

const crypto = require('crypto');

let handler = null; // async ({ phone, text, name, raw }) => { reply? }
function setHandler(fn) { handler = typeof fn === 'function' ? fn : null; }

/** GET verification: Meta calls with hub.mode/hub.verify_token/hub.challenge. */
function verifyChallenge(query = {}) {
  const token = process.env.WHATSAPP_VERIFY_TOKEN || '';
  const mode = query['hub.mode'];
  const verifyToken = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && verifyToken && verifyToken === token) {
    return { ok: true, challenge };
  }
  return { ok: false };
}

/** Optional: verify the X-Hub-Signature-256 header against the app secret. */
function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET || '';
  if (!secret) return true; // not configured -> skip (dev)
  try {
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === String(signatureHeader || '');
  } catch { return false; }
}

// Extract message text from the various Cloud API message types.
function extractText(msg) {
  if (!msg) return '';
  switch (msg.type) {
    case 'text': return msg.text?.body || '';
    case 'button': return msg.button?.text || '';
    case 'interactive':
      return msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
    case 'image': return msg.image?.caption || '[image]';
    case 'document': return msg.document?.caption || '[document]';
    case 'audio': return '[audio]';
    case 'video': return msg.video?.caption || '[video]';
    case 'location': return '[location]';
    default: return `[${msg.type || 'unknown'}]`;
  }
}

/**
 * Parse a Cloud API POST body into normalized inbound messages.
 * @returns {Array<{ phone, text, name, raw }>}
 */
function parsePayload(body = {}) {
  const out = [];
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change.value || {};
      const contacts = value.contacts || [];
      const nameByWa = {};
      for (const c of contacts) nameByWa[c.wa_id] = c.profile?.name || '';
      for (const msg of (value.messages || [])) {
        out.push({
          phone: String(msg.from || '').replace(/[^\d]/g, ''),
          text: extractText(msg),
          name: nameByWa[msg.from] || '',
          messageId: msg.id || null,
          raw: msg
        });
      }
    }
  }
  return out;
}

/**
 * Handle a verified POST. Parses + dispatches each message to the injected handler (message router).
 * @returns {Promise<{ processed:number, replies:Array }>}
 */
async function handlePayload(body) {
  const messages = parsePayload(body);
  const replies = [];
  for (const m of messages) {
    if (!m.phone) continue;
    if (handler) {
      try { const r = await handler(m); if (r && r.reply) replies.push({ phone: m.phone, reply: r.reply }); }
      catch { /* keep processing others */ }
    }
  }
  return { processed: messages.length, replies };
}

module.exports = { setHandler, verifyChallenge, verifySignature, parsePayload, handlePayload };
