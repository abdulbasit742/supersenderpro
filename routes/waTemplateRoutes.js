// routes/waTemplateRoutes.js — WhatsApp #1: Business (HSM) template registry.
//
// Wire-up (server.js):
//   app.use('/api/whatsapp/templates', require('./routes/waTemplateRoutes'));
//
// To send via Cloud API:
//   const payload = require('./lib/whatsapp/businessTemplates').buildPayload(id, phone, ['Basit','ORD-1']);
//   await postToCloudApi(payload);

const express = require('express');
const router = express.Router();

let tpl;
try { tpl = require('../lib/whatsapp/businessTemplates'); } catch { tpl = null; }

function ensure(res) {
  if (!tpl) { res.status(503).json({ ok: false, error: 'WA templates not available' }); return false; }
  return true;
}

// List. Query: ?status=&category=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, templates: tpl.listTemplates(req.query) });
});

// Create. Body: { name, language?, category, body, headerText?, footerText? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, template: tpl.createTemplate(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Set status (synced from Meta). Body: { status, reason? }
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  try {
    const t = tpl.setStatus(req.params.id, (req.body || {}).status, (req.body || {}).reason);
    if (!t) return res.status(404).json({ ok: false, error: 'Template not found' });
    res.json({ ok: true, template: t });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Build a send payload. Body: { toPhone, params? }
router.post('/:id/payload', (req, res) => {
  if (!ensure(res)) return;
  const { toPhone, params } = req.body || {};
  try { res.json({ ok: true, payload: tpl.buildPayload(req.params.id, toPhone, params || []) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
