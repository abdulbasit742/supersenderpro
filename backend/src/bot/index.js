const { startWhatsAppSession } = require('../whatsapp/baileysClient');
const { handleIncomingWhatsApp } = require('../whatsapp/messageHandler');

async function startBot(sessionKey = 'main', io) {
  return startWhatsAppSession(sessionKey, io, (msg, key) => handleIncomingWhatsApp(msg, key, io));
}

module.exports = { startBot };
