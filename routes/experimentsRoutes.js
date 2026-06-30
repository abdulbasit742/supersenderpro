const express = require('express');
const experiments = require('../lib/experiments');
module.exports = function () {
  const router = express.Router();
  router.get('/experiments', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, experiments: experiments.listExperiments(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.post('/experiments', (req, res) => { try { const { storeId = 'default_store', name, metric, variants } = req.body || {}; res.json({ success: true, experiment: experiments.createExperiment(storeId, { name, metric, variants }) }); } catch (e) { res.status(400).json({ success: false, error: e.message }); } });
  router.get('/experiments/:id/results', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; const deriveCRM = req.query.deriveCRM === 'true'; res.json({ success: true, results: experiments.results(storeId, req.params.id, { deriveCRM }) }); } catch (e) { res.status(404).json({ success: false, error: e.message }); } });
  router.post('/experiments/:id/assign', (req, res) => { try { const { storeId = 'default_store', phone } = req.body || {}; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, assignment: experiments.assign(storeId, req.params.id, phone) }); } catch (e) { res.status(400).json({ success: false, error: e.message }); } });
  router.post('/experiments/:id/track', (req, res) => { try { const { storeId = 'default_store', phone, type } = req.body || {}; if (!phone || !type) return res.status(400).json({ success: false, error: 'phone and type are required' }); res.json({ success: true, event: experiments.track(storeId, req.params.id, phone, type) }); } catch (e) { res.status(400).json({ success: false, error: e.message }); } });
  router.post('/experiments/:id/decide', (req, res) => { try { const { variant } = req.body || {}; if (!variant) return res.status(400).json({ success: false, error: 'variant is required' }); res.json({ success: true, experiment: experiments.decideWinner(req.params.id, variant) }); } catch (e) { res.status(400).json({ success: false, error: e.message }); } });
  return router;
};
