const fs = require('fs');
const path = require('path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');
const config = require('./config');
const db = require('./db');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class SessionManager {
  constructor() {
    this.sessions = new Map();
    fs.mkdirSync(config.sessionRoot, { recursive: true });
  }

  get(sessionName = config.primarySession) {
    return this.sessions.get(sessionName);
  }

  getPrimarySocket() {
    return this.get(config.primarySession)?.sock || this.sessions.values().next().value?.sock || null;
  }

  async start(sessionName = config.primarySession, messageHandler) {
    const existing = this.sessions.get(sessionName);
    if (existing?.status === 'connected') return existing.sock;

    const authDir = path.join(config.sessionRoot, sessionName);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['AI Tools Reseller Bot', 'Chrome', '1.0']
    });

    const session = { name: sessionName, sock, status: 'connecting', lastQr: '' };
    this.sessions.set(sessionName, session);

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        session.status = 'qr';
        session.lastQr = qr;
        console.log(`\n📱 Scan QR for session: ${sessionName}\n`);
        qrcode.generate(qr, { small: true });
      }
      if (connection === 'open') {
        session.status = 'connected';
        session.lastQr = '';
        const id = jidNormalizedUser(sock.user?.id || '');
        console.log(`✅ WhatsApp connected: ${sessionName} (${id})`);
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        session.status = 'disconnected';
        console.log(`⚠️ WhatsApp disconnected: ${sessionName} (${code || 'unknown'})`);
        if (code !== DisconnectReason.loggedOut) {
          setTimeout(() => this.start(sessionName, messageHandler).catch(console.error), 5000);
        } else {
          console.log(`❌ Session logged out. Delete ${authDir} and reconnect.`);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages || []) {
        try {
          await messageHandler(sock, msg, this);
        } catch (error) {
          console.error('Message handler error:', error.message);
        }
      }
    });

    return sock;
  }

  async sendText(to, message, sessionName = config.primarySession) {
    const sock = this.get(sessionName)?.sock || this.getPrimarySocket();
    if (!sock) throw new Error('No connected WhatsApp session');
    return sock.sendMessage(to, { text: message });
  }

  async syncGroups(sessionName = config.primarySession) {
    const sock = this.get(sessionName)?.sock || this.getPrimarySocket();
    if (!sock) return [];
    const groups = await sock.groupFetchAllParticipating();
    const rows = Object.values(groups).map(g => ({
      id: g.id,
      name: g.subject,
      memberCount: g.participants?.length || 0
    }));
    for (const group of rows) {
      const isDealer = config.dealerGroups.has(group.id);
      const isCustomer = config.customerGroups.has(group.id);
      db.saveGroupSetting({
        groupId: group.id,
        groupName: group.name,
        groupType: isDealer ? 'dealer' : 'customer',
        monitorRates: isDealer,
        broadcastEnabled: isCustomer
      });
    }
    return rows;
  }

  async broadcastToCustomerGroups(message) {
    const groups = db.getBroadcastGroups();
    const sent = [];
    const failed = [];
    for (const group of groups) {
      try {
        await this.sendText(group.group_id, message);
        sent.push(group.group_id);
      } catch (error) {
        failed.push({ groupId: group.group_id, error: error.message });
      }
      await delay(config.broadcastDelayMs);
    }
    return { sent, failed };
  }

  async sendToAdmins(message) {
    const sent = [];
    const failed = [];
    for (const number of config.adminNumbers) {
      const jid = `${number}@s.whatsapp.net`;
      try {
        await this.sendText(jid, message);
        sent.push(number);
      } catch (error) {
        failed.push({ number, error: error.message });
      }
    }
    return { sent, failed };
  }
}

module.exports = { SessionManager, delay };
