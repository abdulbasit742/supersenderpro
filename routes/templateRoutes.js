// routes/templateRoutes.js — Templates #1: reusable message templates.
//
// Wire-up (server.js):
//   app.use('/api/templates', require('./routes/templateRoutes'));
//
// Use in a broadcast/drip: render a template for a contact, then pass text+media to the guarded
// sender / segment broadcast.
//   const { text } = require('./lib/templates/templateManager').render(tplId, contactProfile);

const express = require('express');
const router = express.Router();

let tpl;
try { tpl = require('../lib/templates/templateManager'); } catch { tpl = null; }

function ensure(res) {
  if (!tpl) { res.status(503).json({ ok: false, error: 'Template manager not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, templates: tpl.listTemplates(req.query.category) });
});

// Create. Body: { name, body, category?, mediaPath? }
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

// Preview with sample data. Body: { sample? }
router.post('/:id/preview', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...tpl.preview(req.params.id, (req.body || {}).sample || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Render for a contact. Body: { contact, extra? }
router.post('/:id/render', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...tpl.render(req.params.id, (req.body || {}).contact || {}, (req.body || {}).extra || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
