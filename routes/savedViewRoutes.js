// routes/savedViewRoutes.js — Views #1: saved filter/sort views.
//
// Wire-up (server.js):
//   app.use('/api/views', require('./routes/savedViewRoutes'));
//
// To render a view, fetch the entity's rows then apply:
//   const sv = require('./lib/views/savedViews');
//   const rows = require('./lib/crm/customer360').listProfiles();
//   const { rows: filtered } = sv.apply(viewId, rows);

const express = require('express');
const router = express.Router();

let sv;
try { sv = require('../lib/views/savedViews'); } catch { sv = null; }

// Optional providers so /apply can fetch rows itself. setProvider('contacts', () => [...])
const providers = {};
router.setProvider = (entity, fn) => { if (typeof fn === 'function') providers[entity] = fn; };

function ensure(res) {
  if (!sv) { res.status(503).json({ ok: false, error: 'Saved views not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, views: sv.listViews({ entity: req.query.entity, ownerId: req.query.ownerId }) });
});

// Create. Body: { name, entity, filters?, match?, sort?, columns?, ownerId?, shared?, pinned? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, view: sv.createView(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const v = sv.updateView(req.params.id, req.body || {});
  if (!v) return res.status(404).json({ ok: false, error: 'View not found' });
  res.json({ ok: true, view: v });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...sv.deleteView(req.params.id) });
});

// Apply a view. If a provider for the view's entity is wired, it fetches rows itself;
// otherwise pass rows in the body: { rows: [...] }.
router.post('/:id/apply', (req, res) => {
  if (!ensure(res)) return;
  const view = sv.getView(req.params.id);
  if (!view) return res.status(404).json({ ok: false, error: 'View not found' });
  const rows = (req.body && req.body.rows) || (providers[view.entity] ? providers[view.entity]() : []);
  res.json({ ok: true, ...sv.apply(req.params.id, rows) });
});

module.exports = router;
