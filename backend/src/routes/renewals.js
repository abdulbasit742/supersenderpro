const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../../data/renewals.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }
function dl(r) { return Math.ceil((new Date(r.expiryDate).getTime() - Date.now()) / 86400000); }

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = load().map(r => ({ ...r, daysLeft: dl(r), urgency: dl(r) < 0 ? 'expired' : dl(r) <= 3 ? 'critical' : dl(r) <= 7 ? 'warning' : 'ok' }));
  res.json(data.sort((a, b) => a.daysLeft - b.daysLeft));
}));
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const data = load(); let expired = 0, critical = 0, warning = 0, ok = 0, renewed = 0;
  data.forEach(r => { if (r.renewed) { renewed++; return; } const d = dl(r); if (d < 0) expired++; else if (d <= 3) critical++; else if (d <= 7) warning++; else ok++; });
  res.json({ total: data.length, expired, critical, warning, ok, renewed });
}));
router.get('/due', asyncHandler(async (req, res) => {
  res.json(load().filter(r => {
    if (r.renewed) return false;
    const d = dl(r), sent = n => (r.reminders || []).some(rm => rm.daysLeft === n);
    return (d === 7 && !sent(7)) || (d === 3 && !sent(3)) || (d === 1 && !sent(1));
  }));
}));
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { customerPhone, customerName, tool, plan = 'Monthly', expiryDate, orderId } = req.body || {};
  if (!customerPhone || !tool || !expiryDate) return res.status(400).json({ error: 'customerPhone, tool, expiryDate required' });
  const data = load();
  const r = { id: uuid(), customerPhone, customerName: customerName || 'Customer', tool, plan, expiryDate, orderId: orderId || null, createdAt: new Date().toISOString(), reminders: [], renewed: false };
  data.unshift(r); save(data); res.status(201).json(r);
}));
router.patch('/:id/remind', requireAuth, asyncHandler(async (req, res) => {
  const data = load(), idx = data.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  (data[idx].reminders = data[idx].reminders || []).push({ sentAt: new Date().toISOString(), daysLeft: req.body.daysLeft || 0 });
  save(data); res.json(data[idx]);
}));
router.patch('/:id/renewed', requireAuth, asyncHandler(async (req, res) => {
  const data = load(), idx = data.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  data[idx].renewed = true; data[idx].renewedAt = new Date().toISOString();
  save(data); res.json(data[idx]);
}));
module.exports = router;
