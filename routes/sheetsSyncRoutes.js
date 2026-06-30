// routes/sheetsSyncRoutes.js — Integrations #1: Google Sheets sync.
//
// Wire-up (server.js) — inject a Sheets client + contact upsert:
//   const sheets = require('./lib/integrations/sheetsSync');
//   sheets.setClient({ readRows: gsReadRows, appendRow: gsAppendRow }); // your googleapis or Apps Script wrapper
//   sheets.setUpsert((c) => require('./lib/crm/customer360').upsertProfile(c.phone, c));
//   app.use('/api/integrations/sheets', require('./routes/sheetsSyncRoutes'));

const express = require('express');
const router = express.Router();

let sheets;
try { sheets = require('../lib/integrations/sheetsSync'); } catch { sheets = null; }

function ensure(res) {
  if (!sheets) { res.status(503).json({ ok: false, error: 'Sheets sync not available' }); return false; }
  return true;
}

// Configure. Body: { tenantId, sheetId, contactsRange?, ordersTab?, mapping? }
router.post('/configure', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, config: sheets.configure(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  const cfg = sheets.getConfig(req.params.tenantId);
  if (!cfg) return res.status(404).json({ ok: false, error: 'No sync configured' });
  res.json({ ok: true, config: cfg });
});

// Pull contacts from the sheet.
router.post('/:tenantId/pull-contacts', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...(await sheets.pullContacts(req.params.tenantId)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Push an order. Body: { order: {...} }
router.post('/:tenantId/push-order', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...(await sheets.pushOrder(req.params.tenantId, (req.body || {}).order || {})) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
