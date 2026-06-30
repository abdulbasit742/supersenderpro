// Self-mountable Express router for the AI Occasion Greeter.
// Mount: app.use('/api/occasion-greeter', require('./routes/occasionGreeterRoutes'));
// server.js is NOT modified directly.

const express = require('express');
const router = express.Router();
const greeter = require('../lib/occasionGreeter/occasionGreeter');

function tenantOf(req) {
  return req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || (req.query && req.query.tenantId);
}

// Add / update a contact with occasion dates
router.post('/contacts', function (req, res) {
  try {
    const tenantId = tenantOf(req);
    const rec = greeter.upsertContact(tenantId, req.body || {});
    res.json({ ok: true, contact: rec });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// List stored contacts
router.get('/contacts', function (req, res) {
  try {
    const tenantId = tenantOf(req);
    res.json({ ok: true, contacts: greeter.listContacts(tenantId) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Remove a contact
router.delete('/contacts/:phone', function (req, res) {
  try {
    const tenantId = tenantOf(req);
    const removed = greeter.removeContact(tenantId, req.params.phone);
    res.json({ ok: true, removed: removed });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Who is due (no message text). ?window=7 for upcoming 7 days
router.get('/due', function (req, res) {
  try {
    const tenantId = tenantOf(req);
    const w = req.query.window ? parseInt(req.query.window, 10) : 0;
    res.json({ ok: true, due: greeter.dueOccasions(tenantId, w) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Build greetings (optional Ollama phrasing). ?window=0 today only
router.get('/greetings', async function (req, res) {
  try {
    const tenantId = tenantOf(req);
    const w = req.query.window ? parseInt(req.query.window, 10) : 0;
    const greetings = await greeter.buildGreetings(tenantId, w);
    res.json({ ok: true, greetings: greetings });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
