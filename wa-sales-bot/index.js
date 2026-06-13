require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { initDatabase } = require('./db/database');
const queries = require('./db/queries');
const { handleIncomingMessage } = require('./bot/messageHandler');
const { startCronJobs } = require('./bot/scheduler/cron');
const { startApiServer } = require('./apiServer');

const baseDir = __dirname;
fs.mkdirSync(path.join(baseDir, 'sessions'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'uploads'), { recursive: true });

const config = {
  adminNumbers: String(process.env.ADMIN_NUMBER || '')
    .split(',')
    .map(item => queries.normalizeNumber(item))
    .filter(Boolean),
  jazzCash: process.env.JAZZCASH_NUMBER || '',
  easyPaisa: process.env.EASYPAISA_NUMBER || '',
  bankAccount: process.env.BANK_ACCOUNT || '',
  botName: process.env.BOT_NAME || 'AI Tools Store',
  greeting: process.env.GREETING || 'السلام علیکم',
  sellingGroups: String(process.env.SELLING_GROUPS || process.env.DEALER_GROUPS || '').split(',').map(item => item.trim()).filter(Boolean),
  dealerGroups: String(process.env.SELLING_GROUPS || process.env.DEALER_GROUPS || '').split(',').map(item => item.trim()).filter(Boolean),
  customerGroups: String(process.env.CUSTOMER_GROUPS || '').split(',').map(item => item.trim()).filter(Boolean),
  sessionNames: String(process.env.SESSION_NAMES || 'main').split(',').map(item => item.trim()).filter(Boolean),
  defaultMarkupPercent: Number(process.env.DEFAULT_MARKUP_PERCENT || 18),
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 3),
  timezone: process.env.TIMEZONE || 'Asia/Karachi',
  apiPort: Number(process.env.BOT_API_PORT || 4110)
};

const runtime = {
  baseDir,
  config,
  sockets: new Map(),
  groupNames: new Map(),
  primarySession: null,
  getPrimarySocket() {
    const preferred = runtime.primarySession ? runtime.sockets.get(runtime.primarySession) : null;
    if (preferred?.user) return preferred;
    for (const sock of runtime.sockets.values()) {
      if (sock?.user) return sock;
    }
    return null;
  },
  adminJid() {
    return config.adminNumbers[0] ? `${config.adminNumbers[0]}@s.whatsapp.net` : '';
  },
  async sendText(jid, text) {
    const sock = runtime.getPrimarySocket();
    if (!sock) throw new Error('No active WhatsApp session');
    return sock.sendMessage(jid, { text });
  },
  async broadcastToCustomerGroups(message) {
    const sock = runtime.getPrimarySocket();
    if (!sock) throw new Error('No active WhatsApp session');
    const sent = [];
    const failed = [];
    for (const groupId of config.customerGroups) {
      try {
        await sock.sendMessage(groupId, { text: message });
        sent.push(groupId);
      } catch (error) {
        failed.push({ groupId, error: error.message });
      }
    }
    return { sent, failed };
  }
};

async function connectSession(sessionName) {
  const authDir = path.join(baseDir, 'sessions', sessionName);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['SuperSender Pro', 'Chrome', '1.0.0']
  });

  runtime.sockets.set(sessionName, sock);
  if (!runtime.primarySession) runtime.primarySession = sessionName;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log(`\nQR for session "${sessionName}"\n`);
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log(`✅ Session connected: ${sessionName}`);
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`❌ Session disconnected: ${sessionName} (${statusCode || 'unknown'})`);
      if (shouldReconnect) {
        setTimeout(() => connectSession(sessionName).catch(console.error), 3000);
      }
    }
  });

  sock.ev.on('groups.update', updates => {
    updates.forEach(update => {
      if (update.id && update.subject) {
        runtime.groupNames.set(update.id, update.subject);
      }
    });
  });

  sock.ev.on('messages.upsert', async payload => {
    for (const msg of payload.messages || []) {
      try {
        await handleIncomingMessage(runtime, sock, msg);
      } catch (error) {
        console.error('Message handling error:', error.message);
      }
    }
  });
}

async function bootstrap() {
  initDatabase();
  startApiServer(runtime);
  startCronJobs(runtime);
  for (const sessionName of config.sessionNames) {
    await connectSession(sessionName);
  }
  console.log(`🚀 ${config.botName} started with ${config.sessionNames.length} session(s).`);
}

bootstrap().catch(error => {
  console.error('Fatal startup error:', error);
  process.exitCode = 1;
});
