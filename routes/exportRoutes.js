// routes/exportRoutes.js — Export #1: CSV downloads.
//
// Wire-up (server.js) — register each dataset once, then mount:
//   const csv = require('./lib/export/csvExporter');
//   csv.register('contacts', () => require('./lib/crm/customer360').listProfiles()
//       .map(p => ({ phone:p.phone, name:p.name, stage:p.stage, totalSpent:p.stats?.totalSpent, orders:p.stats?.orderCount })));
//   csv.register('leads',    () => require('./lib/leads/leadCapture').listLeads());
//   csv.register('deals',    () => require('./lib/crm/salesPipeline').listDeals());
//   csv.register('invoices', () => require('./lib/saasBilling/invoiceEngine').listInvoices());
//   app.use('/api/export', require('./routes/exportRoutes'));

const express = require('express');
const router = express.Router();

let csv;
try { csv = require('../lib/export/csvExporter'); } catch { csv = null; }

function ensure(res) {
  if (!csv) { res.status(503).json({ ok: false, error: 'Export not available' }); return false; }
  return true;
}

// What can be exported.
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, datasets: csv.available() });
});

// Download a dataset as CSV. /api/export/:name.csv
router.get('/:name.csv', (req, res) => {
  if (!ensure(res)) return;
  const out = csv.exportDataset(req.params.name, req.query);
  if (!out) return res.status(404).json({ ok: false, error: 'Unknown dataset' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
  res.send(out.csv);
});

// JSON preview (row count + first rows) without downloading.
router.get('/:name/preview', (req, res) => {
  if (!ensure(res)) return;
  const out = csv.exportDataset(req.params.name, req.query);
  if (!out) return res.status(404).json({ ok: false, error: 'Unknown dataset' });
  res.json({ ok: true, filename: out.filename, rowCount: out.rowCount, csvPreview: out.csv.split('\r\n').slice(0, 6).join('\n') });
});

module.exports = router;
