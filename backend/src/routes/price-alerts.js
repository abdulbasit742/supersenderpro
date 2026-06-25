const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../../data/price_alerts.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

router.get('/', requireAuth, asyncHandler(async (req, res) => { res.json(load()); }));
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const data = load();
  const active = data.filter(a => a.active && !a.triggered);
  const byTool = {};
  active.forEach(a => { byTool[a.tool] = (byTool[a.tool] || 0) + 1; });
  res.json({ total: data.length, active: active.length, triggered: data.filter(a => a.triggered).length, byTool });
}));
router.post('/', asyncHandler(async (req, res) => {
  const { customerPhone, tool, targetPrice, currentPrice } = req.body || {};
  if (!customerPhone || !tool || !targetPrice) return res.status(400).json({ error: 'customerPhone, tool, targetPrice required' });
  const data = load();
  const existing = data.find(a => a.customerPhone === customerPhone && a.tool === tool && a.active);
  if (existing) return res.status(409).json({ error: 'Active alert already exists', existing });
  const alert = { id: uuid(), customerPhone, tool, targetPrice: Number(targetPrice), currentPrice: currentPrice ? Number(currentPrice) : null, createdAt: new Date().toISOString(), active: true, triggered: false, triggeredAt: null };
  data.unshift(alert); save(data); res.status(201).json(alert);
}));
router.get('/check/:tool/:price', requireAuth, asyncHandler(async (req, res) => {
  const tool = req.params.tool, currentPrice = Number(req.params.price);
  const data = load();
  const triggered = data.filter(a => a.active && !a.triggered && a.tool === tool && currentPrice <= a.targetPrice);
  triggered.forEach(a => { const idx = data.findIndex(x => x.id === a.id); if (idx >= 0) { data[idx].triggered = true; data[idx].triggeredAt = new Date().toISOString(); data[idx].triggeredPrice = currentPrice; } });
  if (triggered.length) save(data);
  res.json({ tool, currentPrice, triggered: triggered.length, customers: triggered.map(a => ({ phone: a.customerPhone, targetPrice: a.targetPrice })) });
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  const data = load(), idx = data.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Alert not found' });
  data[idx].active = false; save(data); res.json({ success: true });
}));
module.exports = router;
