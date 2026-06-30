// Self-mountable invoice routes. server.js untouched.
// Mount: app.use('/api/invoice', require('./routes/invoiceRoutes'));

'use strict';

const express = require('express');
const router = express.Router();
const gen = require('../lib/invoiceGenerator/invoiceGenerator');

function tenantOf(req) {
  return (req.headers && (req.headers['x-tenant-id'] || req.headers['x-tenant'])) ||
    (req.body && req.body.tenantId) ||
    (req.query && req.query.tenantId) || null;
}

router.get('/health', function (req, res) {
  res.json({ ok: true, feature: 'invoiceGenerator' });
});

router.post('/create', async function (req, res) {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId required' });
    const order = (req.body && req.body.order) || req.body || {};
    const opts = { thankYou: req.body && req.body.thankYou };
    const invoice = await gen.createInvoice(tenantId, order, opts);
    res.json({ ok: true, invoice: invoice });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

router.get('/get/:invoiceNumber', function (req, res) {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId required' });
    const inv = gen.getInvoice(tenantId, req.params.invoiceNumber);
    if (!inv) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, invoice: inv });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

router.get('/list', function (req, res) {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId required' });
    res.json({ ok: true, invoices: gen.listInvoices(tenantId) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

router.get('/render/:invoiceNumber', function (req, res) {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId required' });
    const inv = gen.getInvoice(tenantId, req.params.invoiceNumber);
    if (!inv) return res.status(404).json({ ok: false, error: 'not found' });
    res.type('text/plain').send(gen.renderText(inv));
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

module.exports = router;
