// routes/invoiceRoutes.js — Payments & Billing #3: invoices + receipts.
//
// Wire-up (server.js):
//   app.use('/api/invoices', require('./routes/invoiceRoutes'));
//
// Auto-issue from fulfillment (#1): in activateSubscription/activateOrder or after fulfillPayment,
//   const { issuePaidReceipt } = require('./lib/saasBilling/invoiceEngine');
//   await issuePaidReceipt({ customer, planName, amount: event.amount, currency: event.currency,
//                            meta: { paymentRef: event.paymentRef, planId: event.planId } });

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

let inv;
try { inv = require('../lib/saasBilling/invoiceEngine'); } catch { inv = null; }

function ensure(res) {
  if (!inv) { res.status(503).json({ ok: false, error: 'Invoice engine not available' }); return false; }
  return true;
}

// List invoices. Query: ?customer=&status=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, invoices: inv.listInvoices({ customer: req.query.customer, status: req.query.status }) });
});

// Create an invoice. Body: { customer, lineItems, status?, currency?, taxRate?, meta? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, invoice: inv.createInvoice(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:invoiceNo', (req, res) => {
  if (!ensure(res)) return;
  const i = inv.getInvoice(req.params.invoiceNo);
  if (!i) return res.status(404).json({ ok: false, error: 'Invoice not found' });
  res.json({ ok: true, invoice: i });
});

// Mark an invoice paid. Body: { paymentRef? }
router.post('/:invoiceNo/mark-paid', (req, res) => {
  if (!ensure(res)) return;
  const i = inv.markPaid(req.params.invoiceNo, (req.body || {}).paymentRef);
  if (!i) return res.status(404).json({ ok: false, error: 'Invoice not found' });
  res.json({ ok: true, invoice: i });
});

// Generate (if needed) and download the PDF receipt.
router.get('/:invoiceNo/receipt', async (req, res) => {
  if (!ensure(res)) return;
  try {
    const filePath = await inv.renderReceiptPDF(req.params.invoiceNo);
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'Receipt not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
