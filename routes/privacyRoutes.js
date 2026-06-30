// routes/privacyRoutes.js — Compliance #2: data privacy requests.
//
// Wire-up (server.js) — register each data source's collect/erase, protect behind owner perms:
//   const privacy = require('./lib/compliance/privacyRequests');
//   const c360 = require('./lib/crm/customer360');
//   privacy.registerSource('profile', {
//     collect: (p) => c360.getProfile(p),
//     erase:   (p) => { /* delete the profile in your store */ return { erased: true }; }
//   });
//   // register inbox, orders, consent, etc. similarly
//   const { requirePermission } = require('./lib/team/teamAccess');
//   app.use('/api/privacy', requirePermission('*'), require('./routes/privacyRoutes'));

const express = require('express');
const router = express.Router();

let privacy;
try { privacy = require('../lib/compliance/privacyRequests'); } catch { privacy = null; }

function ensure(res) {
  if (!privacy) { res.status(503).json({ ok: false, error: 'Privacy module not available' }); return false; }
  return true;
}

// Which sources are wired.
router.get('/sources', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, sources: privacy.registeredSources() });
});

// Export all data for a contact. /api/privacy/export/:phone
router.get('/export/:phone', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...(await privacy.exportData(req.params.phone)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Erase a contact (right-to-be-forgotten). DESTRUCTIVE. Body: { confirm: true }
router.post('/erase/:phone', async (req, res) => {
  if (!ensure(res)) return;
  if (!(req.body && req.body.confirm === true)) return res.status(400).json({ ok: false, error: 'confirm:true required' });
  try { res.json({ ok: true, ...(await privacy.eraseData(req.params.phone)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Request log (audit).
router.get('/log', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, requests: privacy.listRequests(Number(req.query.limit) || 100) });
});

module.exports = router;
