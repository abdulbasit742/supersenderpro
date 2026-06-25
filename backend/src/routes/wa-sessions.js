const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const fs = require('fs'), path = require('path');

const FILE = path.join(__dirname, '../../../data/wa_sessions.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return {}; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

// Session states inspired by WAHA: STOPPED|STARTING|QR_CODE|WORKING|FAILED
const VALID_STATES = ['STOPPED', 'STARTING', 'QR_CODE', 'WORKING', 'FAILED'];

// GET /api/wa-sessions — list all sessions with status
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const sessions = load();
  const authRoot = process.env.WA_AUTH_ROOT || './.baileys-auth';
  const result = Object.keys(sessions).map(name => {
    const s = sessions[name];
    const authPath = path.join(process.cwd(), authRoot, name);
    const hasAuth = fs.existsSync(authPath);
    return { name, state: s.state || 'STOPPED', engine: s.engine || 'baileys', createdAt: s.createdAt, lastSeen: s.lastSeen, hasAuth, config: { autoConnect: s.autoConnect !== false } };
  });
  // Add built-in sessions from .env
  const envSessions = [process.env.WA_CUSTOMER_SESSION || 'customer-bot', process.env.WA_DEALER_SESSION || 'dealer-monitor', process.env.WA_ADMIN_SESSION || 'admin-alerts'];
  envSessions.forEach(name => { if (!result.find(r => r.name === name)) result.push({ name, state: 'STOPPED', engine: 'baileys', hasAuth: fs.existsSync(path.join(process.cwd(), authRoot, name)), config: { autoConnect: true } }); });
  res.json(result);
}));

// GET /api/wa-sessions/:name — single session detail
router.get('/:name', requireAuth, asyncHandler(async (req, res) => {
  const sessions = load();
  const name = req.params.name;
  const s = sessions[name] || { state: 'STOPPED' };
  const authRoot = process.env.WA_AUTH_ROOT || './.baileys-auth';
  const authPath = path.join(process.cwd(), authRoot, name);
  res.json({ name, state: s.state || 'STOPPED', engine: s.engine || 'baileys', createdAt: s.createdAt, lastSeen: s.lastSeen, hasAuth: fs.existsSync(authPath), metrics: s.metrics || { messagesSent: 0, messagesReceived: 0, reconnects: 0 } });
}));

// POST /api/wa-sessions — create new session
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { name, engine = 'baileys', autoConnect = true } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: 'name must be alphanumeric with - or _' });
  const sessions = load();
  if (sessions[name]) return res.status(409).json({ error: 'Session already exists' });
  sessions[name] = { state: 'STOPPED', engine, autoConnect, createdAt: new Date().toISOString(), lastSeen: null, metrics: { messagesSent: 0, messagesReceived: 0, reconnects: 0 } };
  save(sessions);
  res.status(201).json({ name, state: 'STOPPED', engine, message: 'Session created. Use POST /api/wa-sessions/' + name + '/start to connect.' });
}));

// POST /api/wa-sessions/:name/state — update state (internal/bot use)
router.post('/:name/state', asyncHandler(async (req, res) => {
  const { state, metrics } = req.body || {};
  if (!VALID_STATES.includes(state)) return res.status(400).json({ error: 'state must be: ' + VALID_STATES.join('|') });
  const sessions = load();
  const name = req.params.name;
  sessions[name] = sessions[name] || {};
  sessions[name].state = state;
  sessions[name].lastSeen = new Date().toISOString();
  if (metrics) sessions[name].metrics = { ...sessions[name].metrics, ...metrics };
  save(sessions);
  res.json({ name, state, updatedAt: sessions[name].lastSeen });
}));

// DELETE /api/wa-sessions/:name — remove session (auth files)
router.delete('/:name', requireAuth, asyncHandler(async (req, res) => {
  const sessions = load();
  const name = req.params.name;
  const authRoot = process.env.WA_AUTH_ROOT || './.baileys-auth';
  const authPath = path.join(process.cwd(), authRoot, name);
  delete sessions[name];
  save(sessions);
  if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
  res.json({ success: true, name, message: 'Session and auth files removed' });
}));

// GET /api/wa-sessions/overview/stats — all sessions summary
router.get('/overview/stats', requireAuth, asyncHandler(async (req, res) => {
  const sessions = load();
  const counts = { STOPPED: 0, STARTING: 0, QR_CODE: 0, WORKING: 0, FAILED: 0 };
  Object.values(sessions).forEach(s => { counts[s.state || 'STOPPED'] = (counts[s.state || 'STOPPED'] || 0) + 1; });
  res.json({ total: Object.keys(sessions).length, states: counts, healthy: counts.WORKING, needsAttention: counts.FAILED + counts.QR_CODE });
}));

module.exports = router;
