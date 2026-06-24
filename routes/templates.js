'use strict';

/**
 * routes/templates.js
 * REST API for reusable message templates (spintax + {{variables}}).
 *
 * Wiring (add near other route mounts in server.js):
 *   const { mountTemplates } = require('./routes/templates');
 *   mountTemplates(app);
 */

const express = require('express');
const store = require('../lib/templateStore');
const spintax = require('../lib/spintax');

function mountTemplates(app) {
  const router = express.Router();

  router.get('/templates', (req, res) => {
    res.json({ ok: true, templates: store.listTemplates() });
  });

  router.post('/templates', (req, res) => {
    const b = req.body || {};
    if (!b.body || !String(b.body).trim()) {
      return res.status(400).json({ ok: false, error: 'body is required' });
    }
    res.status(201).json({ ok: true, template: store.createTemplate(b) });
  });

  router.get('/templates/:id', (req, res) => {
    const t = store.getTemplate(req.params.id);
    if (!t) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, template: t });
  });

  router.put('/templates/:id', (req, res) => {
    const t = store.updateTemplate(req.params.id, req.body || {});
    if (!t) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, template: t });
  });

  router.delete('/templates/:id', (req, res) => {
    if (!store.deleteTemplate(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  // Render preview with sample variables (also works for ad-hoc bodies)
  router.post('/templates/:id/preview', (req, res) => {
    const vars = (req.body && req.body.variables) || {};
    const rendered = store.renderTemplate(req.params.id, vars);
    if (rendered == null) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, rendered });
  });

  // Stateless preview for any body without saving a template first
  router.post('/templates-preview', (req, res) => {
    const b = req.body || {};
    res.json({
      ok: true,
      rendered: spintax.render(b.body || '', b.variables || {}),
      variables: spintax.extractVariables(b.body || ''),
      variants: spintax.countVariants(b.body || ''),
    });
  });

  app.use('/api', router);
  return { router };
}

module.exports = { mountTemplates };
