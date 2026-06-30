'use strict';
/**
 * Self-mountable router for AI Smart Contact Tagging (#105).
 * Mount in server.js / aiSuite with:
 *   app.use('/api/contact-tagging', require('./routes/contactTaggingRoutes'));
 */
const express = require('express');
const router = express.Router();
const tagging = require('../lib/contactTagging/contactTagging');

function tenantOf(req) {
  return req.tenantId || req.headers['x-tenant-id'] || (req.body && req.body.tenantId);
}

// POST /tag  { contactId, history:[{text,ts,amount,direction}], ai?:bool }
router.post('/tag', async (req, res) => {
  try {
    const tenantId = tenantOf(req);
    const { contactId, history, ai } = req.body || {};
    const rec = await tagging.tagContact(tenantId, contactId, history, { ai: !!ai });
    res.json({ ok: true, contact: rec });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// GET /contact/:id
router.get('/contact/:id', (req, res) => {
  try {
    const rec = tagging.getContact(tenantOf(req), req.params.id);
    if (!rec) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, contact: rec });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// GET /segment/:tag
router.get('/segment/:tag', (req, res) => {
  try {
    const list = tagging.segment(tenantOf(req), req.params.tag);
    res.json({ ok: true, tag: req.params.tag, count: list.length, contacts: list });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// GET /summary
router.get('/summary', (req, res) => {
  try { res.json({ ok: true, ...tagging.summary(tenantOf(req)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
