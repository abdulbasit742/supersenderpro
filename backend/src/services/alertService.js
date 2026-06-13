const prisma = require('./prisma');

async function createAlert({ type = 'system', title, message, severity = 'info', meta = {} }) {
  return prisma.alert.create({ data: { type, title, message, severity, meta } });
}

module.exports = { createAlert };
