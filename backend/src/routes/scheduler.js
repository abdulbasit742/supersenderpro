const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../../data/scheduled_messages.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const msgs = load();
  res.json(req.query.status ? msgs.filter(m => m.status === req.query.status) : msgs);
}));
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const msgs = load(); const byStatus = {};
  msgs.forEach(m => { byStatus[m.status] = (byStatus[m.status] || 0) + 1; });
  res.json({ total: msgs.length, byStatus, totalSent: msgs.filter(m => m.status === 'sent').reduce((s, m) => s + (m.sentCount || 0), 0) });
}));
router.get('/due', asyncHandler(async (req, res) => {
  const now = Date.now();
  res.json(load().filter(m => m.status === 'pending' && m.scheduledAt && new Date(m.scheduledAt).getTime() <= now));
}));
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { message, targets, scheduledAt, type = 'once', recurPattern } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!scheduledAt && type === 'once') return res.status(400).json({ error: 'scheduledAt required for one-time messages' });
  const item = { id: uuid(), message, targets: targets || ['all_customers'], type, recurPattern: recurPattern || null, scheduledAt: scheduledAt || null, status: 'pending', createdAt: new Date().toISOString(), createdBy: req.user.email, sentAt: null, sentCount: 0 };
  const msgs = load(); msgs.unshift(item); save(msgs);
  res.status(201).json(item);
}));
router.patch('/:id/mark-sent', requireAuth, asyncHandler(async (req, res) => {
  const msgs = load(), idx = msgs.findIndex(m => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  msgs[idx].status = 'sent'; msgs[idx].sentAt = new Date().toISOString(); msgs[idx].sentCount = req.body.sentCount || 0;
  save(msgs); res.json(msgs[idx]);
}));
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const msgs = load(), idx = msgs.findIndex(m => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  if (msgs[idx].status === 'sent') return res.status(409).json({ error: 'Already sent' });
  msgs[idx].status = 'cancelled'; msgs[idx].cancelledAt = new Date().toISOString();
  save(msgs); res.json({ success: true });
}));
module.exports = router;
