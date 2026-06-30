// routes/templateRoutes.js — Templates #1: reusable message templates.
//
// Wire-up (server.js):
//   app.use('/api/templates', require('./routes/templateRoutes'));
//
// Use anywhere you send: const { text, mediaPath } = require('./lib/templates/templateManager')
//   .render(templateId, customer360.getProfile(phone) || { name });

const express = require('express');
const router = express.Router();

let tpl;
try { tpl = require('../lib/templates/templateManager'); } catch { tpl = null; }

function ensure(res) {
  if (!tpl) { res.status(503).json({ ok: false, error: 'Template manager not available' }); return false; }
  return true;
}

// List (optionally by category).
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, templates: tpl.listTemplates(req.query.category) });
});

// Create. Body: { name, body, category?, language?, mediaPath? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, template: tpl.createTemplate(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const t = tpl.getTemplate(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: 'Template not found' });
  res.json({ ok: true, template: t });
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const t = tpl.updateTemplate(req.params.id, req.body || {});
  if (!t) return res.status(404).json({ ok: false, error: 'Template not found' });
  res.json({ ok: true, template: t });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...tpl.deleteTemplate(req.params.id) });
});

// Render preview. Body: { data: { name, ... } }
router.post('/:id/render', (req, res) => {
  if (!ensure(res)) return;
  const out = tpl.render(req.params.id, (req.body || {}).data || {});
  if (!out) return res.status(404).json({ ok: false, error: 'Template not found' });
  res.json({ ok: true, ...out });
});

module.exports = router;
