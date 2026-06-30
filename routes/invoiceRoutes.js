// routes/invoiceRoutes.js — Payments & Billing #3: invoices + receipts.
//
// Wire-up (server.js):
//   const invoices = require('./lib/saasBilling/invoiceEngine');
//   invoices.configure({ business: { name:'SuperSender Pro', taxId:'...', email:'...' }, currency:'PKR' });
//   app.use('/api/invoices', require('./routes/invoiceRoutes'));
//
// From fulfillment (#1): create an invoice + markPaid on a verified payment, then send the PDF
// (renderPdf returns a Buffer you can attach to WhatsApp/email).

const express = require('express');
const router = express.Router();

let invoices;
try { invoices = require('../lib/saasBilling/invoiceEngine'); } catch { invoices = null; }

function ensure(res) {
  if (!invoices) { res.status(503).json({ ok: false, error: 'Invoice engine not available' }); return false; }
  return true;
}

// Create an invoice. Body: { customer, items:[{description,qty,unitPrice}], discount?, taxRatePct?, planId?, orderId?, paymentRef? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, invoice: invoices.createInvoice(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List. Query: ?status=&customerPhone=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, invoices: invoices.listInvoices({ status: req.query.status, customerPhone: req.query.customerPhone }) });
});

router.get('/:number', (req, res) => {
  if (!ensure(res)) return;
  const inv = invoices.getInvoice(req.params.number);
  if (!inv) return res.status(404).json({ ok: false, error: 'Invoice not found' });
  res.json({ ok: true, invoice: inv });
});

// Mark paid (becomes a receipt). Body: { paymentRef? }
router.post('/:number/mark-paid', (req, res) => {
  if (!ensure(res)) return;
  const inv = invoices.markPaid(req.params.number, (req.body || {}).paymentRef);
  if (!inv) return res.status(404).json({ ok: false, error: 'Invoice not found' });
  res.json({ ok: true, invoice: inv });
});

// Download the PDF (invoice if unpaid, receipt if paid).
router.get('/:number/pdf', async (req, res) => {
  if (!ensure(res)) return;
  try {
    const pdf = await invoices.renderPdf(req.params.number);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${req.params.number}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(e.message === 'invoice not found' ? 404 : 500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
