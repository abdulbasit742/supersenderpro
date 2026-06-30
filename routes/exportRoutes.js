// routes/exportRoutes.js — Export #1: CSV downloads.
//
// Wire-up (server.js):
//   const xport = require('./lib/export/dataExport');
//   xport.configure({
//     contacts: () => require('./lib/crm/customer360').listProfiles(),
//     leads:    () => require('./lib/leads/leadCapture').listLeads(),
//     deals:    () => require('./lib/crm/salesPipeline').listDeals(),
//     invoices: () => require('./lib/saasBilling/invoiceEngine').listInvoices()
//   });
//   app.use('/api/export', require('./routes/exportRoutes'));

const express = require('express');
const router = express.Router();

let xport;
try { xport = require('../lib/export/dataExport'); } catch { xport = null; }

function ensure(res) {
  if (!xport) { res.status(503).json({ ok: false, error: 'Export not available' }); return false; }
  return true;
}

// What can be exported.
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, available: xport.available() });
});

// Download a dataset as CSV. /api/export/:name.csv  (name: contacts|leads|deals|invoices)
router.get('/:name.csv', (req, res) => {
  if (!ensure(res)) return;
  const out = xport.exportDataset(req.params.name);
  if (!out) return res.status(404).json({ ok: false, error: `no exporter for '${req.params.name}'` });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
  res.send(out.csv);
});

module.exports = router;
