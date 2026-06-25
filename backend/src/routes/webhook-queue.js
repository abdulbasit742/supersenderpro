const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');

const QUEUE_FILE = path.join(__dirname, '../../../data/webhook_queue.json');
const ENDPOINTS_FILE = path.join(__dirname, '../../../data/webhook_endpoints.json');

function loadQueue() { try { return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); } catch(e) { return []; } }
function saveQueue(d) { fs.writeFileSync(QUEUE_FILE, JSON.stringify(d.slice(0, 5000), null, 2)); }
function loadEndpoints() { try { return JSON.parse(fs.readFileSync(ENDPOINTS_FILE, 'utf8')); } catch(e) { return []; } }
function saveEndpoints(d) { fs.writeFileSync(ENDPOINTS_FILE, JSON.stringify(d, null, 2)); }

const EVENT_TYPES = ['message.received', 'message.sent', 'payment.verified', 'order.created', 'order.delivered', 'session.state', 'customer.new', 'renewal.due', 'stock.low'];

// GET /api/webhook-queue/endpoints — list registered endpoints
router.get('/endpoints', requireAuth, asyncHandler(async (req, res) => { res.json(loadEndpoints()); }));

// POST /api/webhook-queue/endpoints — register webhook endpoint
router.post('/endpoints', requireAuth, asyncHandler(async (req, res) => {
  const { url, events = ['message.received'], secret } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  try { new URL(url); } catch(e) { return res.status(400).json({ error: 'Invalid URL' }); }
  const endpoints = loadEndpoints();
  const endpoint = { id: uuid(), url, events, secret: secret || uuid().replace(/-/g,''), active: true, createdAt: new Date().toISOString(), stats: { sent: 0, failed: 0, pending: 0 } };
  endpoints.push(endpoint); saveEndpoints(endpoints);
  res.status(201).json({ ...endpoint, secret: '[SAVED - shown only once: ' + endpoint.secret + ']' });
}));

// DELETE /api/webhook-queue/endpoints/:id
router.delete('/endpoints/:id', requireAuth, asyncHandler(async (req, res) => {
  const eps = loadEndpoints().filter(e => e.id !== req.params.id);
  saveEndpoints(eps); res.json({ success: true });
}));

// GET /api/webhook-queue/events — list event types
router.get('/events', (req, res) => res.json(EVENT_TYPES));

// GET /api/webhook-queue — list queued/recent events
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const queue = loadQueue();
  const filter = req.query.status;
  const list = filter ? queue.filter(e => e.status === filter) : queue;
  res.json(list.slice(0, Number(req.query.limit || 100)));
}));

// POST /api/webhook-queue/dispatch — dispatch event to all registered endpoints
router.post('/dispatch', requireAuth, asyncHandler(async (req, res) => {
  const { event, payload } = req.body || {};
  if (!event || !payload) return res.status(400).json({ error: 'event and payload required' });
  const endpoints = loadEndpoints().filter(e => e.active && e.events.includes(event));
  if (!endpoints.length) return res.json({ dispatched: 0, message: 'No active endpoints subscribed to this event' });
  const queue = loadQueue();
  const entry = { id: uuid(), event, payload, createdAt: new Date().toISOString(), status: 'pending', attempts: 0, lastAttempt: null, endpoints: endpoints.map(e => ({ id: e.id, url: e.url, status: 'pending', responseCode: null })) };
  queue.unshift(entry); saveQueue(queue);
  // Try to deliver immediately
  let delivered = 0;
  for (const ep of endpoints) {
    try {
      const axios = require('axios');
      const crypto = require('crypto');
      const body = JSON.stringify({ event, payload, timestamp: entry.createdAt, id: entry.id });
      const sig = ep.secret ? crypto.createHmac('sha256', ep.secret).update(body).digest('hex') : '';
      const r = await axios.post(ep.url, JSON.parse(body), { headers: { 'Content-Type': 'application/json', 'X-SuperSender-Event': event, 'X-SuperSender-Signature': sig }, timeout: 5000 });
      const epEntry = entry.endpoints.find(e => e.id === ep.id);
      if (epEntry) { epEntry.status = 'delivered'; epEntry.responseCode = r.status; }
      delivered++;
    } catch(err) {
      const epEntry = entry.endpoints.find(e => e.id === ep.id);
      if (epEntry) { epEntry.status = 'failed'; epEntry.error = err.message; }
    }
  }
  entry.status = delivered === endpoints.length ? 'delivered' : delivered > 0 ? 'partial' : 'failed';
  entry.attempts = 1; entry.lastAttempt = new Date().toISOString();
  const finalQueue = loadQueue().map(q => q.id === entry.id ? entry : q);
  saveQueue(finalQueue);
  res.json({ id: entry.id, event, dispatched: endpoints.length, delivered, failed: endpoints.length - delivered });
}));

// GET /api/webhook-queue/stats
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const queue = loadQueue();
  const byStatus = {};
  queue.forEach(e => { byStatus[e.status] = (byStatus[e.status]||0)+1; });
  const byEvent = {};
  queue.forEach(e => { byEvent[e.event] = (byEvent[e.event]||0)+1; });
  res.json({ total: queue.length, byStatus, byEvent, endpoints: loadEndpoints().length });
}));

module.exports = router;
