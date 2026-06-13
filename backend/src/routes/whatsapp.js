const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { startWhatsAppSession, startDefaultSessions, sendWhatsAppMessage, listGroups, getSession, getStatuses, switchSession } = require('../whatsapp/baileysClient');
const { handleIncomingWhatsApp } = require('../whatsapp/messageHandler');
const groupManager = require('../whatsapp/groupManager');

const router = express.Router();

router.get('/status', asyncHandler(async (req, res) => {
  res.json({ sessions: getStatuses() });
}));

router.post('/connect', asyncHandler(async (req, res) => {
  const sessionKey = req.body?.sessionKey || 'main';
  const io = req.app.get('io');
  await startWhatsAppSession(sessionKey, io, (msg, key) => handleIncomingWhatsApp(msg, key, io));
  res.json({ success: true, sessionKey, status: getSession(sessionKey)?.status || 'CONNECTING' });
}));

router.post('/connect-defaults', asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const sessions = await startDefaultSessions(io, (msg, key) => handleIncomingWhatsApp(msg, key, io));
  res.json({ success: true, sessions });
}));

router.post('/switch-session', asyncHandler(async (req, res) => {
  const session = switchSession(req.body?.sessionId || req.body?.sessionKey || 'customer-bot');
  res.json({ success: true, session });
}));

router.get('/qr/:sessionKey?', asyncHandler(async (req, res) => {
  const session = getSession(req.params.sessionKey || 'main');
  res.json({ qr: session?.qr || '', status: session?.status || 'DISCONNECTED' });
}));

router.post('/send', asyncHandler(async (req, res) => {
  const { to, message, sessionKey = 'main', mediaUrl = null } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
  const result = await sendWhatsAppMessage({ to, message, sessionKey, mediaUrl });
  res.json({ success: true, result });
}));

router.get('/groups', asyncHandler(async (req, res) => {
  const groups = await listGroups(req.query.sessionKey || 'main');
  res.json(groups);
}));

router.get('/groups/:groupId/metadata', asyncHandler(async (req, res) => {
  res.json(await groupManager.getGroupMetadata(req.params.groupId, req.query.sessionKey));
}));

router.get('/groups/:groupId/members', asyncHandler(async (req, res) => {
  res.json(await groupManager.getGroupMembers(req.params.groupId, req.query.sessionKey));
}));

router.post('/groups/:groupId/dm-members', asyncHandler(async (req, res) => {
  res.json(await groupManager.sendToAllMembers(req.params.groupId, req.body?.message, { sessionKey: req.body?.sessionKey, delayMs: req.body?.delayMs }));
}));

router.post('/groups/sync', asyncHandler(async (req, res) => {
  const groups = await listGroups(req.body?.sessionKey || 'main');
  let saved = 0;
  for (const group of groups) {
    await prisma.whatsAppGroup.upsert({
      where: { waGroupId: group.id },
      update: { name: group.name },
      create: { waGroupId: group.id, name: group.name, type: 'CUSTOMER' }
    });
    saved++;
  }
  res.json({ success: true, saved, groups });
}));

router.get('/group-settings', asyncHandler(async (req, res) => {
  const groups = await prisma.whatsAppGroup.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
  res.json(groups);
}));

router.put('/group-settings/:id', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const group = await prisma.whatsAppGroup.update({
    where: { id: req.params.id },
    data: {
      ...(body.type ? { type: body.type } : {}),
      ...(body.monitorRates !== undefined ? { monitorRates: Boolean(body.monitorRates) } : {}),
      ...(body.broadcastEnabled !== undefined ? { broadcastEnabled: Boolean(body.broadcastEnabled) } : {}),
      ...(body.settings !== undefined ? { settings: body.settings } : {})
    }
  });
  res.json(group);
}));

module.exports = router;
