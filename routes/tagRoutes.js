// routes/tagRoutes.js — Tags #1: tag registry.
//
// Wire-up (server.js) — hook contact reads/writes so rename/merge cascade + usage counts work:
//   const tags = require('./lib/tags/tagManager');
//   const c360 = require('./lib/crm/customer360');
//   tags.setContactHooks({
//     list: () => c360.listProfiles().map(p => ({ phone: p.phone, tags: p.tags || [] })),
//     setTags: (phone, t) => c360.upsertProfile(phone, { tags: t })
//   });
//   app.use('/api/tags', require('./routes/tagRoutes'));

const express = require('express');
const router = express.Router();

let tags;
try { tags = require('../lib/tags/tagManager'); } catch { tags = null; }

function ensure(res) {
  if (!tags) { res.status(503).json({ ok: false, error: 'Tag manager not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, tags: tags.listTags() });
});

// Create. Body: { name, color?, description? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, tag: tags.createTag(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Update (rename cascades). Body: { name?, color?, description? }
router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const t = tags.updateTag(req.params.id, req.body || {});
  if (!t) return res.status(404).json({ ok: false, error: 'Tag not found' });
  res.json({ ok: true, tag: t });
});

// Merge. Body: { from, into }
router.post('/merge', (req, res) => {
  if (!ensure(res)) return;
  const { from, into } = req.body || {};
  try { res.json({ ok: true, ...tags.mergeTags(from, into) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Delete. Query: ?removeFromContacts=true to also strip it off contacts
router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...tags.deleteTag(req.params.id, { removeFromContacts: req.query.removeFromContacts === 'true' }) });
});

module.exports = router;
