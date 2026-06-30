// routes/workflowTemplateRoutes.js — Workflow Builder #2: ready-made templates.
//
// Wire-up (server.js), after the workflow engine + its action handlers are registered:
//   app.use('/api/workflows/templates', require('./routes/workflowTemplateRoutes'));

const express = require('express');
const router = express.Router();

let templates;
try { templates = require('../lib/workflows/workflowTemplates'); } catch { templates = null; }

function ensure(res) {
  if (!templates) { res.status(503).json({ ok: false, error: 'Workflow templates not available' }); return false; }
  return true;
}

// List available templates (meta only).
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, templates: templates.listTemplates() });
});

// One template's detail.
router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const t = templates.getTemplate(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: 'Template not found' });
  res.json({ ok: true, template: t });
});

// One-click install. Body: { params: { ... } }
router.post('/:id/install', (req, res) => {
  if (!ensure(res)) return;
  try {
    const wf = templates.installTemplate(req.params.id, (req.body || {}).params || {});
    res.json({ ok: true, workflow: wf });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
