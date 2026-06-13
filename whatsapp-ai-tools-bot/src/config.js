const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function list(value = '') {
  return String(value || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('3')) return `92${digits}`;
  return digits;
}

const root = path.join(__dirname, '..');
const primarySession = process.env.PRIMARY_SESSION || 'main';

module.exports = {
  root,
  botName: process.env.BOT_NAME || 'AI Tools Store',
  storeName: process.env.STORE_NAME || 'AI Tools Store',
  adminNumbers: list(process.env.ADMIN_NUMBERS).map(normalizePhone),
  primarySession,
  sessionNames: list(process.env.SESSION_NAMES || primarySession),
  databasePath: path.resolve(root, process.env.DATABASE_PATH || './data/bot.sqlite'),
  sessionRoot: path.resolve(root, process.env.SESSION_ROOT || './sessions'),
  dealerGroups: new Set(list(process.env.DEALER_GROUPS)),
  customerGroups: new Set(list(process.env.CUSTOMER_GROUPS)),
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 2),
  rateCollectionCron: process.env.RATE_COLLECTION_CRON || '0 9 * * *',
  priceBroadcastCron: process.env.PRICE_BROADCAST_CRON || '0 10 * * *',
  salesSummaryCron: process.env.SALES_SUMMARY_CRON || '0 18 * * *',
  timezone: process.env.TIMEZONE || 'Asia/Karachi',
  broadcastDelayMs: Number(process.env.BROADCAST_DELAY_MS || 3000),
  normalizePhone
};
