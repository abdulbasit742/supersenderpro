const path = require('path');
const pino = require('pino');
const qrcode = require('qrcode');
const env = require('../config/env');

let baileys = null;
try {
  baileys = require('@whiskeysockets/baileys');
} catch {
  baileys = null;
}

const sessions = new Map();
let activeSessionKey = env.customerSessionId || 'customer-bot';

function assertBaileys() {
  if (!baileys) throw new Error('Baileys is not installed. Run npm install in backend/.');
}

function getSession(sessionKey = 'main') {
  return sessions.get(sessionKey) || null;
}

function getSocket(sessionKey = 'main') {
  return sessions.get(sessionKey)?.sock || null;
}

function sessionForRole(role = 'customer') {
  const key = String(role || '').toLowerCase();
  if (key === 'dealer') return env.dealerSessionId;
  if (key === 'admin') return env.adminSessionId;
  if (key === 'main') return 'main';
  return env.customerSessionId;
}

function switchSession(sessionId = '') {
  const target = sessionId || env.customerSessionId;
  activeSessionKey = target;
  return getSession(target);
}

async function startWhatsAppSession(sessionKey = 'main', io, onMessage) {
  assertBaileys();
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
  } = baileys;

  if (sessions.get(sessionKey)?.status === 'CONNECTED') return sessions.get(sessionKey);

  const authDir = path.resolve(process.cwd(), env.waAuthRoot, sessionKey);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const session = { sessionKey, status: 'CONNECTING', qr: '', sock: null };
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['SuperSender AI Tools', 'Chrome', '3.0']
  });
  session.sock = sock;
  sessions.set(sessionKey, session);

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      session.qr = await qrcode.toDataURL(qr);
      session.status = 'QR';
      io?.emit('wa:qr', { sessionKey, qr: session.qr });
    }
    if (connection === 'open') {
      session.status = 'CONNECTED';
      session.qr = '';
      io?.emit('wa:status', { sessionKey, status: 'CONNECTED' });
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      session.status = 'DISCONNECTED';
      io?.emit('wa:status', { sessionKey, status: 'DISCONNECTED', reason });
      if (reason !== DisconnectReason.loggedOut) {
        setTimeout(() => startWhatsAppSession(sessionKey, io, onMessage).catch(() => {}), 5000);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages || []) {
      if (!msg.message || msg.key.fromMe) continue;
      try {
        await onMessage?.(msg, sessionKey);
      } catch (error) {
        io?.emit('wa:error', { sessionKey, error: error.message });
      }
    }
  });

  return session;
}

async function startDefaultSessions(io, onMessage) {
  const sessionIds = [...new Set([env.customerSessionId, env.dealerSessionId, env.adminSessionId].filter(Boolean))];
  const results = [];
  for (const sessionId of sessionIds) {
    try {
      results.push(await startWhatsAppSession(sessionId, io, onMessage));
    } catch (error) {
      console.error('[baileys:startDefaultSessions]', sessionId, error);
      results.push({ sessionKey: sessionId, status: 'ERROR', error: error.message });
    }
  }
  return results;
}

async function sendWhatsAppMessage({ to, message, sessionKey = 'main', mediaUrl = null }) {
  const key = sessionKey === 'active' ? activeSessionKey : sessionKey;
  const sock = getSocket(key);
  if (!sock) throw new Error(`WhatsApp session ${key} is not connected`);
  if (mediaUrl) {
    const lower = String(mediaUrl).toLowerCase();
    if (lower.endsWith('.pdf')) return sock.sendMessage(to, { document: { url: mediaUrl }, mimetype: 'application/pdf', fileName: mediaUrl.split(/[\\/]/).pop(), caption: message || '' });
    return sock.sendMessage(to, { image: { url: mediaUrl }, caption: message || '' });
  }
  return sock.sendMessage(to, { text: message });
}

async function listGroups(sessionKey = 'main') {
  const sock = getSocket(sessionKey);
  if (!sock) return [];
  const groups = await sock.groupFetchAllParticipating();
  return Object.values(groups).map(g => ({
    id: g.id,
    name: g.subject,
    memberCount: g.participants?.length || 0,
    owner: g.owner || null
  }));
}

async function broadcastToGroups({ groupIds = [], message, sessionKey = 'main', delayMs = 3000 }) {
  const sent = [];
  const failed = [];
  for (const groupId of groupIds) {
    try {
      await sendWhatsAppMessage({ to: groupId, message, sessionKey });
      sent.push(groupId);
    } catch (error) {
      failed.push({ groupId, error: error.message });
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return { sent, failed };
}

function getStatuses() {
  return Array.from(sessions.values()).map(s => ({
    sessionKey: s.sessionKey,
    status: s.status,
    hasQr: Boolean(s.qr)
  }));
}

module.exports = {
  startWhatsAppSession,
  startDefaultSessions,
  sendWhatsAppMessage,
  broadcastToGroups,
  listGroups,
  getSocket,
  getSession,
  sessionForRole,
  switchSession,
  getStatuses
};
