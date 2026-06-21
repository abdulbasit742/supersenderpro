  // routes/superflowRoutes.js
  // SuperFlow Studio - Express router. Mount in server.js via the hook.
  // All actions are dry-run only in this phase (simulator never sends).

  'use strict';

  const express = require('express');
  const router = express.Router();

  const store = require('../lib/superflow/store');
  const templates = require('../lib/superflow/templates');
  const engine = require('../lib/superflow/engine');
  const { validateFlow } = require('../lib/superflow/validators');

  function ok(res, payload) { return res.json(Object.assign({ ok: true }, payload)); }
  function fail(res, code, error) { return res.status(code).json({ ok: false, error: String(error) }); }

  // Status / health.
  router.get('/status', (_req, res) => {
    try { ok(res, { dryRun: true, ...store.stats(), templates: templates.listTemplates().length }); }
    catch (e) { fail(res, 500, e.message); }
  });


  // List flows.
  router.get('/flows', (_req, res) => {
    try { ok(res, { flows: store.listFlows() }); }
    catch (e) { fail(res, 500, e.message); }
  });

  // Create flow.
  router.post('/flows', (req, res) => {
    try {
      const body = req.body || {};


     if (body.nodes || body.edges) {
      const v = validateFlow({ name: body.name, nodes: body.nodes || [], edges: body.edges || [] });
      if (!v.ok) return fail(res, 400, 'invalid flow: ' + v.errors.join('; '));
     }
     ok(res, { flow: store.createFlow(body) });
 } catch (e) { fail(res, 500, e.message); }
});

// Get one flow.
router.get('/flows/:id', (req, res) => {
 try {
     const flow = store.getFlow(req.params.id);
     if (!flow) return fail(res, 404, 'flow not found');
   ok(res, { flow });
 } catch (e) { fail(res, 500, e.message); }
});

// Update flow.
router.put('/flows/:id', (req, res) => {
 try {
   const body = req.body || {};
     if (body.nodes || body.edges) {
       const merged = Object.assign({}, store.getFlow(req.params.id) || {}, body);
      const v = validateFlow(merged);
      if (!v.ok) return fail(res, 400, 'invalid flow: ' + v.errors.join('; '));
     }
     const flow = store.updateFlow(req.params.id, body);
     if (!flow) return fail(res, 404, 'flow not found');
     ok(res, { flow });
 } catch (e) { fail(res, 500, e.message); }
});

// Delete flow.
router.delete('/flows/:id', (req, res) => {
 try {
     const existed = store.deleteFlow(req.params.id);
     if (!existed) return fail(res, 404, 'flow not found');
   ok(res, { deleted: true });
 } catch (e) { fail(res, 500, e.message); }
});


// Duplicate flow.
router.post('/flows/:id/duplicate', (req, res) => {
 try {
   const copy = store.duplicateFlow(req.params.id);
     if (!copy) return fail(res, 404, 'flow not found');
     ok(res, { flow: copy });
 } catch (e) { fail(res, 500, e.message); }
});

// Enable/disable flow.
router.post('/flows/:id/toggle', (req, res) => {
 try {
     const body = req.body || {};
     const flow = store.toggleFlow(req.params.id, typeof body.enabled === 'boolean' ? body.enabled : undefined);
     if (!flow) return fail(res, 404, 'flow not found');
     ok(res, { flow });


   } catch (e) { fail(res, 500, e.message); }
 });

 // Simulate (dry-run only).
 router.post('/flows/:id/simulate', (req, res) => {
   try {
     const flow = store.getFlow(req.params.id);
       if (!flow) return fail(res, 404, 'flow not found');
       const sample = (req.body && req.body.sample) || {};
     ok(res, { simulation: engine.simulate(flow, sample) });
   } catch (e) { fail(res, 500, e.message); }
 });

 // Simulate an ad-hoc flow body without saving (handy for the editor).
 router.post('/simulate', (req, res) => {
   try {
     const body = req.body || {};
     ok(res, { simulation: engine.simulate(body.flow || {}, body.sample || {}) });
   } catch (e) { fail(res, 500, e.message); }
 });


 // Templates list.
 router.get('/templates', (_req, res) => {
   try { ok(res, { templates: templates.listTemplates() }); }
   catch (e) { fail(res, 500, e.message); }
 });

 // Create a flow from a template.
 router.post('/templates/:id/create', (req, res) => {
   try {
     const built = templates.buildTemplate(req.params.id);
       if (!built) return fail(res, 404, 'template not found');
       ok(res, { flow: store.createFlow(built) });
   } catch (e) { fail(res, 500, e.message); }
 });

 module.exports = router;
