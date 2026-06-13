const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch {
  // dotenv is installed in production; this fallback keeps syntax/unit checks usable before npm install.
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  waAuthRoot: process.env.WA_AUTH_ROOT || './.baileys-auth',
  googleSheetsId: process.env.GOOGLE_SHEETS_ID || '',
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY || '',
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 2),
  dailySheetsSyncCron: process.env.DAILY_SHEETS_SYNC_CRON || '0 23 * * *',
  dailyRateBroadcastCron: process.env.DAILY_RATE_BROADCAST_CRON || '0 11 * * *',
  adminNumber: process.env.ADMIN_NUMBER || process.env.ADMIN_WA_NUMBER || '',
  sellingGroups: String(process.env.SELLING_GROUPS || '').split(',').map(x => x.trim()).filter(Boolean),
  customerGroups: String(process.env.CUSTOMER_GROUPS || '').split(',').map(x => x.trim()).filter(Boolean),
  jazzcashNumber: process.env.JAZZCASH_NUMBER || '',
  easypaisaNumber: process.env.EASYPAISA_NUMBER || '',
  bankAccount: process.env.BANK_ACCOUNT || '',
  bankName: process.env.BANK_NAME || '',
  botName: process.env.BOT_NAME || 'AI Tools Store',
  privateAccountLabel: process.env.PRIVATE_ACCOUNT_LABEL || 'Limited Time Offer',
  n8nBaseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || '',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  zeroTouchEnableBull: process.env.ZERO_TOUCH_ENABLE_BULL !== 'false',
  zeroTouchPromoLimitPerWeek: Number(process.env.ZERO_TOUCH_PROMO_LIMIT_PER_WEEK || 2),
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  emailImapHost: process.env.EMAIL_IMAP_HOST || 'imap.gmail.com',
  emailImapPort: Number(process.env.EMAIL_IMAP_PORT || 993),
  emailPaymentParserEnabled: process.env.EMAIL_PAYMENT_PARSER_ENABLED === 'true',
  paymentCheckIntervalMs: Number(process.env.PAYMENT_CHECK_INTERVAL_MS || 30000),
  senderNumberVerification: process.env.SENDER_NUMBER_VERIFICATION === 'true',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  adminAuthPassword: process.env.ADMIN_AUTH_PASSWORD || '',
  jazzcashMerchantNumber: process.env.JAZZCASH_MERCHANT_NUMBER || process.env.JAZZCASH_NUMBER || '',
  easypaisaMerchantNumber: process.env.EASYPAISA_MERCHANT_NUMBER || process.env.EASYPAISA_NUMBER || '',
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || process.env.BANK_ACCOUNT || '',
  waSenderApiUrl: process.env.WA_SENDER_API_URL || '',
  waSenderApiKey: process.env.WA_SENDER_API_KEY || '',
  customerSessionId: process.env.WA_CUSTOMER_SESSION || 'customer-bot',
  dealerSessionId: process.env.WA_DEALER_SESSION || 'dealer-monitor',
  adminSessionId: process.env.WA_ADMIN_SESSION || 'admin-alerts'
};
