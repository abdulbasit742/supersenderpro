// routes/invoiceRoutes.js — Payments & Billing #3: invoices + receipts.
//
// Wire-up (server.js):
//   const invoices = require('./lib/saasBilling/invoiceEngine');
//   invoices.configure({ business: { name:'SuperSender Pro', email:'billing@...', phone:'...' }, currency:'PKR', taxPercent: 0 });
//   app.use('/api/invoices', require('./routes/invoiceRoutes'));
//
// From payment fulfillment (#1), call invoices.createPaidReceipt({...}) so every paid order yields
// a receipt the customer can download / be sent on WhatsApp.

const express = require('express');
const router = express.Router();

let invoices;
try { invoices = require('../lib/saasBilling/invoiceEngine'); } catch { invoices = null; }

function ensure(res) {
  if (!invoices) { res.status(503).json({ ok: false, error: 'Invoice engine not available' }); return false; }
  return true;
}

// Create an invoice. Body: { customer, items:[{description,quantity,unitPrice}], currency?, taxPercent?, meta? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, invoice: invoices.createInvoice(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, invoices: invoices.listInvoices({ status: req.query.status, customer: req.query.customer }) });
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const inv = invoices.getInvoice(req.params.id);
  if (!inv) return res.status(404).json({ ok: false, error: 'Invoice not found' });
  res.json({ ok: true, invoice: inv });
});

// Mark paid (-> receipt). Body: { paymentRef? }
router.post('/:id/pay', (req, res) => {
  if (!ensure(res)) return;
  const inv = invoices.markPaid(req.params.id, (req.body || {}).paymentRef);
  if (!inv) return res.status(404).json({ ok: false, error: 'Invoice not found' });
  res.json({ ok: true, invoice: inv });
});

router.post('/:id/void', (req, res) => {
  if (!ensure(res)) return;
  const inv = invoices.voidInvoice(req.params.id);
  if (!inv) return res.status(404).json({ ok: false, error: 'Invoice not found' });
  res.json({ ok: true, invoice: inv });
});

// Download the PDF (invoice or receipt depending on status).
router.get('/:id/pdf', async (req, res) => {
  if (!ensure(res)) return;
  try {
    const inv = invoices.getInvoice(req.params.id);
    if (!inv) return res.status(404).json({ ok: false, error: 'Invoice not found' });
    const pdf = await invoices.renderPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.number}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
