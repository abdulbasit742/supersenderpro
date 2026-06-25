const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../services/prisma');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../../data/segments.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }
function buildWhere(c = {}) {
  const w = {};
  if (c.tier) w.tier = c.tier;
  if (c.promoOptIn !== undefined) w.promoOptIn = c.promoOptIn;
  if (c.botMuted !== undefined) w.botMuted = c.botMuted;
  return w;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => { res.json(load()); }));
router.get('/analytics', requireAuth, asyncHandler(async (req, res) => {
  const tiers = ['Bronze', 'Silver', 'Gold', 'VIP', 'Platinum'];
  const results = await Promise.all(tiers.map(async t => ({ tier: t, count: await prisma.customer.count({ where: { tier: t } }) })));
  const [total, optedIn, muted] = await Promise.all([prisma.customer.count(), prisma.customer.count({ where: { promoOptIn: true } }), prisma.customer.count({ where: { botMuted: true } })]);
  res.json({ total, optedIn, muted, tiers: results });
}));
router.post('/preview', requireAuth, asyncHandler(async (req, res) => {
  const customers = await prisma.customer.findMany({ where: buildWhere(req.body), select: { id: true, phone: true, name: true, tier: true, promoOptIn: true }, take: 200 });
  res.json({ count: customers.length, customers });
}));
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { name, description = '', criteria = {} } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const segs = load();
  const seg = { id: uuid(), name, description, criteria, createdAt: new Date().toISOString(), createdBy: req.user.email };
  segs.push(seg); save(segs); res.status(201).json(seg);
}));
router.get('/:id/customers', requireAuth, asyncHandler(async (req, res) => {
  const seg = load().find(s => s.id === req.params.id);
  if (!seg) return res.status(404).json({ error: 'Segment not found' });
  const customers = await prisma.customer.findMany({ where: buildWhere(seg.criteria), select: { id: true, phone: true, name: true, tier: true, promoOptIn: true }, take: 500 });
  res.json({ segment: seg, count: customers.length, customers });
}));
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  save(load().filter(s => s.id !== req.params.id)); res.json({ success: true });
}));
module.exports = router;
