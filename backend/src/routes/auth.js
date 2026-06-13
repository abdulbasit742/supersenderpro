const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { signToken, requireAuth, requireRole } = require('../middleware/auth');
const env = require('../config/env');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!user || !user.active) return res.status(401).json({ error: 'Invalid login' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid login' });

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}));

router.post('/users', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { name, email, password, role = 'SALES' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const user = await prisma.user.create({
    data: { name, email: String(email).toLowerCase(), passwordHash, role }
  });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
}));

router.get('/users', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }
  });
  res.json(users);
}));

module.exports = router;
