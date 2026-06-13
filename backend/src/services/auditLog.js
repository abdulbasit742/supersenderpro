const prisma = require('./prisma');

async function auditLog({ actor = 'system', action, entity = '', entityId = '', ip = '', metadata = {} }) {
  try {
    return await prisma.auditLog.create({
      data: { actor, action, entity, entityId, ip, metadata }
    });
  } catch (error) {
    console.error('[auditLog]', error);
    return null;
  }
}

module.exports = { auditLog };
