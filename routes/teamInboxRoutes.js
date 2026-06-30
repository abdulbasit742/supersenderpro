// routes/teamInboxRoutes.js
// Self-mountable Express router for the shared team inbox + smart assignment.
// Mount in server.js with a single line:
//     app.use('/api/team-inbox', require('./routes/teamInboxRoutes'));

const express = require('express');
const router = express.Router();
const inbox = require('../lib/teamInbox/teamInbox');

// POST /api/team-inbox/agent   Body: { storeId?, id, name?, skills?, status? }
router.post('/agent', (req, res) => {
  try {
    const { storeId = 'default_store', id, name, skills, status } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'id is required' });
    res.json({ success: true, agent: inbox.upsertAgent({ storeId, id, name, skills, status }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/team-inbox/presence   Body: { storeId?, id, status }
router.post('/presence', (req, res) => {
  try {
    const { storeId = 'default_store', id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ success: false, error: 'id and status are required' });
    res.json({ success: true, agent: inbox.setPresence({ storeId, id, status }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/team-inbox/agents?storeId=
router.get('/agents', (req, res) => {
  try { res.json({ success: true, agents: inbox.listAgents({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/team-inbox/assign   Body: { storeId?, phone, skill?, priority? }
router.post('/assign', (req, res) => {
  try {
    const { storeId = 'default_store', phone, skill, priority } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const r = inbox.assign({ storeId, phone, skill, priority });
    res.status(r.ok ? 200 : 409).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/team-inbox/claim   Body: { storeId?, phone, agentId }
router.post('/claim', (req, res) => {
  try {
    const { storeId = 'default_store', phone, agentId } = req.body || {};
    if (!phone || !agentId) return res.status(400).json({ success: false, error: 'phone and agentId are required' });
    const r = inbox.claim({ storeId, phone, agentId });
    res.status(r.ok ? 200 : 409).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/team-inbox/first-response   Body: { storeId?, phone }
router.post('/first-response', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.body || {}; res.json({ success: true, ...inbox.recordFirstResponse({ storeId, phone }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/team-inbox/resolve   Body: { storeId?, phone }
router.post('/resolve', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.body || {}; res.json({ success: true, ...inbox.resolve({ storeId, phone }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/team-inbox/release   Body: { storeId?, phone }
router.post('/release', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.body || {}; res.json({ success: true, ...inbox.release({ storeId, phone }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/team-inbox/queue?storeId=&status=&assignee=
router.get('/queue', (req, res) => {
  try { const { storeId = 'default_store', status, assignee } = req.query; res.json({ success: true, queue: inbox.queue({ storeId, status, assignee }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/team-inbox/sla-breaches?storeId=
router.get('/sla-breaches', (req, res) => {
  try { res.json({ success: true, breaches: inbox.slaBreaches({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/team-inbox/handoff-note   Body: { storeId?, phone, context? }
router.post('/handoff-note', async (req, res) => {
  try { const { storeId = 'default_store', phone, context } = req.body || {}; res.json({ success: true, ...(await inbox.handoffNote({ storeId, phone, context })) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET/PUT /api/team-inbox/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: inbox.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: inbox.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/team-inbox/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...inbox.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
