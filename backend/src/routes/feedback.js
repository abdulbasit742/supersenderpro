const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../../data/feedback.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = load();
  res.json((req.query.tool ? data.filter(f => f.tool === req.query.tool) : data).slice(0, Number(req.query.limit || 100)));
}));
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const data = load();
  if (!data.length) return res.json({ total: 0, avgRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, topTools: [] });
  const avg = (data.reduce((s, f) => s + f.rating, 0) / data.length).toFixed(2);
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byTool = {};
  data.forEach(f => { dist[f.rating] = (dist[f.rating] || 0) + 1; if (!byTool[f.tool]) byTool[f.tool] = { c: 0, s: 0 }; byTool[f.tool].c++; byTool[f.tool].s += f.rating; });
  const topTools = Object.keys(byTool).map(t => ({ tool: t, count: byTool[t].c, avg: (byTool[t].s / byTool[t].c).toFixed(2) })).sort((a, b) => b.avg - a.avg);
  res.json({ total: data.length, avgRating: Number(avg), distribution: dist, topTools, recentNegative: data.filter(f => f.rating <= 2).slice(0, 5) });
}));
router.post('/', asyncHandler(async (req, res) => {
  const { customerPhone, customerName, tool = 'General', rating, comment = '', orderId } = req.body || {};
  if (!customerPhone || !rating) return res.status(400).json({ error: 'customerPhone and rating required' });
  const r = Number(rating);
  if (r < 1 || r > 5) return res.status(400).json({ error: 'rating must be 1-5' });
  const fb = { id: uuid(), customerPhone, customerName: customerName || 'Customer', tool, rating: r, comment, orderId: orderId || null, createdAt: new Date().toISOString(), replied: false };
  const data = load(); data.unshift(fb); save(data); res.status(201).json(fb);
}));
router.patch('/:id/reply', requireAuth, asyncHandler(async (req, res) => {
  const data = load(), idx = data.findIndex(f => f.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  data[idx].replied = true; data[idx].repliedAt = new Date().toISOString(); data[idx].replyNote = req.body.note || '';
  save(data); res.json(data[idx]);
}));
module.exports = router;
