// routes/crmDedupeRoutes.js — CRM #5: duplicate detection + merge.
//
// Wire-up (server.js):
//   const dedupe = require('./lib/crm/dedupe');
//   const c360 = require('./lib/crm/customer360');
//   const fs = require('fs'), path = require('path');
//   // wire the store to Customer 360's JSON (or Postgres later)
//   dedupe.setStore({
//     list: () => c360.listProfiles(),
//     get: (key) => c360.getProfile(key),
//     save: (p) => { /* persist a full profile object */ },
//     remove: (key) => { /* delete a profile by key */ },
//   });
//   app.use('/api/crm/dedupe', require('./routes/crmDedupeRoutes'));
//
// NOTE: c360 currently exposes list/get; add save(profile)+remove(key) (or a small persistence
// helper) so merges can be written back. Kept out of #1 to stay minimal.

const express = require('express');
const router = express.Router();

let dedupe;
try { dedupe = require('../lib/crm/dedupe'); } catch { dedupe = null; }

function ensure(res) {
  if (!dedupe) { res.status(503).json({ ok: false, error: 'Dedupe engine not available' }); return false; }
  return true;
}

// Candidate duplicate pairs. Query: ?threshold=0.7
router.get('/candidates', (req, res) => {
  if (!ensure(res)) return;
  try {
    const threshold = req.query.threshold ? Number(req.query.threshold) : 0.7;
    res.json({ ok: true, candidates: dedupe.findDuplicates(threshold) });
  } catch (e) { res.status(503).json({ ok: false, error: e.message }); }
});

// Preview a merge. Body: { primaryKey, secondaryKey }
router.post('/preview', (req, res) => {
  if (!ensure(res)) return;
  const { primaryKey, secondaryKey } = req.body || {};
  try { res.json(dedupe.previewMerge(primaryKey, secondaryKey)); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Confirm a merge. Body: { primaryKey, secondaryKey }
router.post('/merge', (req, res) => {
  if (!ensure(res)) return;
  const { primaryKey, secondaryKey } = req.body || {};
  try { res.json(dedupe.merge(primaryKey, secondaryKey)); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
