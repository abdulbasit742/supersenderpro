const config = require('./config');
const db = require('./db');
const { SessionManager } = require('./sessionManager');
const { handleIncomingMessage } = require('./handlers');
const { registerCronJobs } = require('./cronJobs');

async function main() {
  db.initDb();

  const sessionManager = new SessionManager();
  for (const sessionName of config.sessionNames) {
    await sessionManager.start(sessionName, handleIncomingMessage);
  }

  registerCronJobs(sessionManager);

  console.log('🚀 AI Tools WhatsApp Bot started');
  console.log(`📦 DB: ${config.databasePath}`);
  console.log(`👤 Admins: ${config.adminNumbers.join(', ') || 'not configured'}`);
  console.log(`📥 Dealer groups from .env: ${config.dealerGroups.size}`);
  console.log(`📢 Customer groups from .env: ${config.customerGroups.size}`);

  setInterval(() => {
    sessionManager.syncGroups().catch(() => {});
  }, 15 * 60 * 1000);
}

main().catch(error => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
