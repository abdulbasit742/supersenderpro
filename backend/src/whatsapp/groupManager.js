const prisma = require('../services/prisma');
const env = require('../config/env');
const { getSocket, sendWhatsAppMessage } = require('./baileysClient');
const { normalizePhone } = require('../utils/phone');

async function getGroupMetadata(groupId, sessionKey = env.dealerSessionId) {
  const sock = getSocket(sessionKey) || getSocket(env.customerSessionId);
  if (!sock) throw new Error(`WhatsApp session ${sessionKey} is not connected`);
  const meta = await sock.groupMetadata(groupId);
  return {
    id: meta.id,
    name: meta.subject,
    description: meta.desc || '',
    owner: meta.owner || '',
    membersCount: meta.participants?.length || 0,
    participants: meta.participants || []
  };
}

async function getGroupMembers(groupId, sessionKey = env.dealerSessionId) {
  const meta = await getGroupMetadata(groupId, sessionKey);
  return meta.participants.map((participant) => ({
    id: participant.id,
    number: normalizePhone(String(participant.id).split('@')[0]),
    isAdmin: participant.admin === 'admin' || participant.admin === 'superadmin'
  }));
}

async function sendToAllMembers(groupId, message, options = {}) {
  const members = await getGroupMembers(groupId, options.sessionKey || env.customerSessionId);
  const sent = [];
  const failed = [];
  for (const member of members) {
    try {
      await sendWhatsAppMessage({ to: `${member.number}@s.whatsapp.net`, message, sessionKey: options.sessionKey || env.customerSessionId });
      sent.push(member.number);
    } catch (error) {
      failed.push({ number: member.number, error: error.message });
    }
    await new Promise((resolve) => setTimeout(resolve, Number(options.delayMs || 2500)));
  }
  return { sent, failed };
}

function monitorGroup(groupId, callback) {
  const key = String(groupId || '');
  const wrapped = async (msg) => {
    if (msg?.key?.remoteJid === key) return callback(msg);
    return undefined;
  };
  return wrapped;
}

async function addGroup(groupId, type = 'CUSTOMER', name = '') {
  return prisma.whatsAppGroup.upsert({
    where: { waGroupId: groupId },
    update: {
      type,
      name: name || groupId,
      monitorRates: type === 'DEALER',
      broadcastEnabled: type === 'CUSTOMER'
    },
    create: {
      waGroupId: groupId,
      name: name || groupId,
      type,
      monitorRates: type === 'DEALER',
      broadcastEnabled: type === 'CUSTOMER'
    }
  });
}

async function removeGroup(groupId) {
  const existing = await prisma.whatsAppGroup.findFirst({ where: { OR: [{ id: groupId }, { waGroupId: groupId }] } });
  if (!existing) return { success: false, message: 'Group not found' };
  await prisma.whatsAppGroup.delete({ where: { id: existing.id } });
  return { success: true, group: existing };
}

module.exports = {
  getGroupMembers,
  sendToAllMembers,
  monitorGroup,
  getGroupMetadata,
  addGroup,
  removeGroup
};
