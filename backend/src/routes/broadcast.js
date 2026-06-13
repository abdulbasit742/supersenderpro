const express = require('express');
const cron = require('node-cron');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');
const { broadcastToGroups } = require('../whatsapp/waSenderIntegration');
const { renderTemplate } = require('../utils/templates');

const router = express.Router();
const scheduledJobs = new Map();

router.get('/', asyncHandler(async (req, res) => {
  const rows = await prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const broadcast = await prisma.broadcast.create({
    data: {
      title: body.title || 'Broadcast',
      message: body.message,
      targetType: body.targetType || 'groups',
      targetIds: body.targetIds || [],
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.scheduledAt ? 'SCHEDULED' : 'DRAFT'
    }
  });
  res.status(201).json(broadcast);
}));

router.post('/send', asyncHandler(async (req, res) => {
  const { message, groupIds = [], sessionKey = 'main', variables = {} } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message is required' });
  const finalMessage = renderTemplate(message, variables);
  const ids = groupIds.length
    ? groupIds
    : (await prisma.whatsAppGroup.findMany({ where: { broadcastEnabled: true } })).map(g => g.waGroupId);
  const result = await broadcastToGroups(finalMessage, ids, { sessionKey });
  const row = await prisma.broadcast.create({
    data: {
      title: `Manual broadcast ${new Date().toISOString()}`,
      message: finalMessage,
      targetIds: ids,
      sentAt: new Date(),
      status: result.failed.length ? 'FAILED' : 'SENT',
      result
    }
  });
  req.app.get('io')?.emit('broadcast:sent', row);
  res.json({ broadcast: row, result });
}));

router.post('/send-direct', asyncHandler(async (req, res) => {
  const { to, message, sessionKey = 'main', variables = {} } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
  const result = await sendWhatsAppMessage({ to, message: renderTemplate(message, variables), sessionKey });
  res.json({ success: true, result });
}));

router.post('/schedule', asyncHandler(async (req, res) => {
  const { cronTime, message, groupIds = [], sessionKey = 'main' } = req.body || {};
  if (!cronTime || !message) return res.status(400).json({ error: 'cronTime and message are required' });
  if (!cron.validate(cronTime)) return res.status(400).json({ error: 'Invalid cron expression' });
  const id = `job_${Date.now()}`;
  const job = cron.schedule(cronTime, async () => {
    const ids = groupIds.length
      ? groupIds
      : (await prisma.whatsAppGroup.findMany({ where: { broadcastEnabled: true } })).map(g => g.waGroupId);
    await broadcastToGroups(message, ids, { sessionKey });
  }, { timezone: 'Asia/Karachi' });
  scheduledJobs.set(id, job);
  res.json({ success: true, id, cronTime });
}));

module.exports = router;
