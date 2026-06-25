const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');

const FILE = path.join(__dirname, '../../../data/quotes.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d.slice(0, 2000), null, 2)); }
function genNum() { return 'QUO-' + Date.now().toString(36).toUpperCase(); }

function buildQuoteHTML(q) {
  const rows = (q.items || []).map(i => '<tr><td>' + i.name + '</td><td>' + i.type + '</td><td>' + (i.qty||1) + '</td><td>Rs ' + (i.price||0) + '</td><td>Rs ' + (i.price||0)*(i.qty||1) + '</td></tr>').join('');
  const expiry = q.expiryDate ? 'Valid until: ' + new Date(q.expiryDate).toLocaleDateString('en-PK') : '';
  return '<!DOCTYPE html><html><head><title>Quote ' + q.number + '</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:auto}.hdr{background:#f97316;color:#fff;padding:20px;border-radius:8px;margin-bottom:20px}' +
    'table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f97316;color:#fff;padding:10px;text-align:left}' +
    'td{padding:8px;border-bottom:1px solid #eee}.total{text-align:right;font-size:18px;font-weight:bold;padding:12px;background:#fff7ed;border-radius:6px}' +
    '.expiry{color:#dc2626;font-weight:bold}.accepted{color:#16a34a;font-weight:bold}.pending{color:#d97706;font-weight:bold}' +
    '</style></head><body>' +
    '<div class="hdr"><h2>QUOTATION</h2><p>' + (q.botName||'AI Tools Store') + '</p><p>Quote #: ' + q.number + '</p></div>' +
    '<p><strong>Prepared for:</strong> ' + q.customerName + ' | ' + q.customerPhone + '</p>' +
    '<p><strong>Date:</strong> ' + q.date + (expiry ? ' | <span class="expiry">' + expiry + '</span>' : '') + '</p>' +
    '<p><strong>Status:</strong> <span class="' + (q.status||'pending') + '">' + (q.status||'PENDING').toUpperCase() + '</span></p>' +
    '<table><tr><th>Tool/Service</th><th>Type</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>' + rows + '</table>' +
    '<div class="total">Quote Total: Rs ' + q.total + '</div>' +
    '<p style="margin-top:20px;color:#888">This quote is valid for ' + (q.validDays||7) + ' days. To accept, reply YES to this message or contact us.</p>' +
    '</body></html>';
}

// GET /api/quotes — list quotes
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  let data = load();
  if (req.query.status) data = data.filter(q => q.status === req.query.status);
  res.json(data.slice(0, Number(req.query.limit || 50)));
}));

// GET /api/quotes/stats
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const data = load();
  const now = Date.now();
  const expired = data.filter(q => q.status === 'pending' && q.expiryDate && new Date(q.expiryDate).getTime() < now);
  const byStatus = {};
  data.forEach(q => { byStatus[q.status||'pending'] = (byStatus[q.status||'pending']||0) + 1; });
  const totalValue = data.filter(q => q.status === 'accepted').reduce((s,q) => s+(q.total||0), 0);
  res.json({ total: data.length, byStatus, expired: expired.length, acceptedValue: totalValue, conversionRate: data.length ? ((byStatus.accepted||0)/data.length*100).toFixed(1)+'%' : '0%' });
}));

// POST /api/quotes — create quote
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { customerPhone, customerName, items = [], validDays = 7, notes = '' } = req.body || {};
  if (!customerPhone || !items.length) return res.status(400).json({ error: 'customerPhone and items required' });
  const total = items.reduce((s, i) => s + (i.price||0) * (i.qty||1), 0);
  const expiryDate = new Date(Date.now() + validDays * 86400000).toISOString();
  const q = { id: uuid(), number: genNum(), date: new Date().toLocaleDateString('en-PK'), createdAt: new Date().toISOString(), customerPhone, customerName: customerName||'Customer', items, total, validDays, expiryDate, notes, status: 'pending', botName: process.env.BOT_NAME||'AI Tools Store' };
  const data = load(); data.unshift(q); save(data);
  res.status(201).json(q);
}));

// GET /api/quotes/:id/html — quote as HTML
router.get('/:id/html', asyncHandler(async (req, res) => {
  const q = load().find(q => q.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'Quote not found' });
  res.set('Content-Type', 'text/html'); res.send(buildQuoteHTML(q));
}));

// POST /api/quotes/:id/accept — accept quote
router.post('/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const data = load(), idx = data.findIndex(q => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Quote not found' });
  data[idx].status = 'accepted'; data[idx].acceptedAt = new Date().toISOString();
  save(data); res.json(data[idx]);
}));

// POST /api/quotes/:id/convert-to-invoice — convert quote to invoice
router.post('/:id/convert-to-invoice', requireAuth, asyncHandler(async (req, res) => {
  const q = load().find(q => q.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'Quote not found' });
  const axios = require('axios');
  try {
    const invoiceData = { customerPhone: q.customerPhone, customerName: q.customerName, items: q.items, paid: false, orderId: q.id };
    const invFile = path.join(__dirname, '../../../data/invoices.json');
    let invs = []; try { invs = JSON.parse(fs.readFileSync(invFile, 'utf8')); } catch(e) {}
    const { v4: u } = require('uuid');
    const inv = { id: u(), number: 'INV-' + Date.now().toString(36).toUpperCase(), date: new Date().toLocaleDateString('en-PK'), createdAt: new Date().toISOString(), ...invoiceData, total: q.total, botName: process.env.BOT_NAME||'AI Tools Store', jazzcash: process.env.JAZZCASH_NUMBER||'', easypaisa: process.env.EASYPAISA_NUMBER||'' };
    invs.unshift(inv); fs.writeFileSync(invFile, JSON.stringify(invs.slice(0,2000), null, 2));
    // Mark quote as converted
    const qData = load(); const qIdx = qData.findIndex(x => x.id === q.id);
    if (qIdx >= 0) { qData[qIdx].status = 'converted'; qData[qIdx].invoiceId = inv.id; save(qData); }
    res.json({ success: true, invoice: inv, quote: qData[qIdx] || q });
  } catch(err) { res.status(500).json({ error: 'Conversion failed: ' + err.message }); }
}));

// DELETE /api/quotes/:id
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = load(), idx = data.findIndex(q => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  data[idx].status = 'rejected'; data[idx].rejectedAt = new Date().toISOString();
  save(data); res.json({ success: true });
}));

module.exports = router;
