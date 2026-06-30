// routes/contactImportRoutes.js — Import #1: CSV contact import.
//
// Wire-up (server.js):
//   const imp = require('./lib/import/contactImport');
//   imp.setUpsert((c) => require('./lib/crm/customer360').upsertProfile(c.phone, c));
//   app.use('/api/import/contacts', express.json({ limit: '10mb' }), require('./routes/contactImportRoutes'));
//
// Frontend posts the CSV text (or paste). Preview first, then import.

const express = require('express');
const router = express.Router();

let imp;
try { imp = require('../lib/import/contactImport'); } catch { imp = null; }

function ensure(res) {
  if (!imp) { res.status(503).json({ ok: false, error: 'Import not available' }); return false; }
  return true;
}

// Preview mapping + sample. Body: { csv, hasHeader? }
router.post('/preview', (req, res) => {
  if (!ensure(res)) return;
  const { csv, hasHeader } = req.body || {};
  if (!csv) return res.status(400).json({ ok: false, error: 'csv text required' });
  res.json({ ok: true, ...imp.preview(csv, { hasHeader }) });
});

// Import. Body: { csv, mapping?, hasHeader?, defaultTags? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  const { csv, mapping, hasHeader, defaultTags } = req.body || {};
  if (!csv) return res.status(400).json({ ok: false, error: 'csv text required' });
  try { res.json({ ok: true, ...imp.importCSV(csv, { mapping, hasHeader, defaultTags }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
