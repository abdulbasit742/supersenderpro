const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../../data/invoices.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function save(d) { fs.writeFileSync(FILE, JSON.stringify(d.slice(0, 2000), null, 2)); }
function genNum() { return 'INV-' + Date.now().toString(36).toUpperCase(); }
function buildHTML(inv) {
  const rows = (inv.items || []).map(i => '<tr><td>' + i.name + '</td><td>' + i.type + '</td><td>' + (i.qty||1) + '</td><td>Rs ' + (i.price||0) + '</td><td>Rs ' + (i.price||0)*(i.qty||1) + '</td></tr>').join('');
  return '<!DOCTYPE html><html><head><title>Invoice ' + inv.number + '</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:auto}' +
    '.hdr{background:#1a73e8;color:#fff;padding:20px;border-radius:8px;margin-bottom:20px}' +
    'table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#1a73e8;color:#fff;padding:10px;text-align:left}' +
    'td{padding:8px;border-bottom:1px solid #eee}.total{text-align:right;font-size:18px;font-weight:bold;padding:12px;background:#e8f0fe;border-radius:6px}' +
    '.paid{color:#137333;font-weight:bold}.pending{color:#c5221f;font-weight:bold}</style></head>' +
    '<body><div class="hdr"><h2>' + (inv.botName||'AI Tools Store') + '</h2><p>Invoice: ' + inv.number + ' | Date: ' + inv.date + '</p>' +
    '<p>JazzCash: ' + (inv.jazzcash||'N/A') + ' | EasyPaisa: ' + (inv.easypaisa||'N/A') + '</p></div>' +
    '<p><strong>Customer:</strong> ' + inv.customerName + ' | ' + inv.customerPhone + '</p>' +
    '<p><strong>Status:</strong> <span class="' + (inv.paid?'paid':'pending') + '">' + (inv.paid?'PAID':'PENDING') + '</span></p>' +
    '<table><tr><th>Tool/Service</th><th>Type</th><th>Qty</th><th>Price</th><th>Total</th></tr>' + rows + '</table>' +
    '<div class="total">Grand Total: Rs ' + inv.total + '</div>' +
    '<p style="text-align:center;color:#888;margin-top:24px">Thank you for your business!</p></body></html>';
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(load().slice(0, Math.min(Number(req.query.limit || 50), 200)));
}));
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const data = load();
  const totalRev = data.reduce((s, i) => s + (i.total || 0), 0);
  const paid = data.filter(i => i.paid);
  const paidRev = paid.reduce((s, i) => s + (i.total || 0), 0);
  res.json({ count: data.length, paid: paid.length, pending: data.length - paid.length, totalRevenue: totalRev, paidRevenue: paidRev, pendingRevenue: totalRev - paidRev });
}));
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { customerPhone, customerName, items = [], paid = false, orderId } = req.body || {};
  if (!customerPhone || !items.length) return res.status(400).json({ error: 'customerPhone and items required' });
  const total = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const inv = { id: uuid(), number: genNum(), date: new Date().toLocaleDateString('en-PK'), createdAt: new Date().toISOString(), customerPhone, customerName: customerName || 'Customer', items, total, paid, orderId: orderId || null, botName: process.env.BOT_NAME || 'AI Tools Store', jazzcash: process.env.JAZZCASH_NUMBER || '', easypaisa: process.env.EASYPAISA_NUMBER || '' };
  const data = load(); data.unshift(inv); save(data);
  res.status(201).json(inv);
}));
router.get('/:id/html', asyncHandler(async (req, res) => {
  const inv = load().find(i => i.id === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.set('Content-Type', 'text/html'); res.send(buildHTML(inv));
}));
router.patch('/:id/mark-paid', requireAuth, asyncHandler(async (req, res) => {
  const data = load(), idx = data.findIndex(i => i.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Invoice not found' });
  data[idx].paid = true; data[idx].paidAt = new Date().toISOString();
  save(data); res.json(data[idx]);
}));
module.exports = router;
