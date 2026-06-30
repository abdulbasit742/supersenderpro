const express = require('express');
const experiments = require('../lib/experiments');

// A/B Testing API. Read-mostly; the only writes are creating experiments,
// assigning recipients, and recording outcomes — all idempotent/safe.
//
// Mount in server.js next to the other `/api` route mounts:
//   // EXPERIMENTS HOOK
//   app.use('/api', require('./routes/experimentsRoutes')());
module.exports = function () {
  const router = express.Router();

  // List experiments for a store.
  router.get('/experiments', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, experiments: experiments.listExperiments(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Create an experiment. Body: { storeId, name, metric, variants:[{label,template,weight}] }
  router.post('/experiments', (req, res) => {
    try {
      const { storeId = 'default_store', name, metric, variants } = req.body || {};
      res.json({ success: true, experiment: experiments.createExperiment(storeId, { name, metric, variants }) });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
  });

  // Get one experiment's live results (with significance).
  router.get('/experiments/:id/results', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const deriveCRM = req.query.deriveCRM === 'true';
      res.json({ success: true, results: experiments.results(storeId, req.params.id, { deriveCRM }) });
    } catch (err) { res.status(404).json({ success: false, error: err.message }); }
  });

  // Assign (or fetch sticky assignment for) a recipient -> returns the variant + its template.
  router.post('/experiments/:id/assign', (req, res) => {
    try {
      const { storeId = 'default_store', phone } = req.body || {};
      if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
      res.json({ success: true, assignment: experiments.assign(storeId, req.params.id, phone) });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
  });

  // Record an outcome. Body: { storeId, phone, type } where type in delivered|replied|ordered
  router.post('/experiments/:id/track', (req, res) => {
    try {
      const { storeId = 'default_store', phone, type } = req.body || {};
      if (!phone || !type) return res.status(400).json({ success: false, error: 'phone and type are required' });
      res.json({ success: true, event: experiments.track(storeId, req.params.id, phone, type) });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
  });

  // Manually lock a winner. Body: { variant }
  router.post('/experiments/:id/decide', (req, res) => {
    try {
      const { variant } = req.body || {};
      if (!variant) return res.status(400).json({ success: false, error: 'variant is required' });
      res.json({ success: true, experiment: experiments.decideWinner(req.params.id, variant) });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
  });

  return router;
};
