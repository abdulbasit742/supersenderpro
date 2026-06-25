const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../services/prisma');
const multer = require('multer');
const fs = require('fs'), path = require('path');
const upload = multer({ dest: path.join(__dirname, '../../../tmp/'), limits: { fileSize: 5 * 1024 * 1024 } });

function parseCSV(text) {
  const NL = String.fromCharCode(10), CR = String.fromCharCode(13);
  const cleaned = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === CR) { cleaned.push(NL); if (text[i+1] === NL) i++; } else cleaned.push(text[i]);
  }
  const lines = cleaned.join('').split(NL).filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(function(line) {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {}; headers.forEach(function(h, i) { obj[h] = vals[i] || ''; }); return obj;
  });
}

function toCSV(rows, fields) {
  const NL = String.fromCharCode(10);
  const header = fields.join(',');
  const body = rows.map(function(r) {
    return fields.map(function(f) { const v = r[f] != null ? String(r[f]) : ''; return v.indexOf(',') >= 0 ? '"' + v + '"' : v; }).join(',');
  });
  return [header].concat(body).join(NL);
}

router.get('/template/customers', function(req, res) {
  const NL = String.fromCharCode(10);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename=customers-template.csv');
  res.send(['phone,name,tier', '923001234567,Ali Ahmed,Silver', '923009876543,Sara Khan,Gold'].join(NL));
});

router.get('/template/dealers', function(req, res) {
  const NL = String.fromCharCode(10);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename=dealers-template.csv');
  res.send(['phone,name,dCode', '923001234567,Test Dealer,D001'].join(NL));
});

router.get('/customers/export', requireAuth, asyncHandler(async function(req, res) {
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 });
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename=customers-' + new Date().toISOString().slice(0, 10) + '.csv');
  res.send(toCSV(customers, ['phone', 'name', 'tier', 'promoOptIn', 'botMuted', 'createdAt']));
}));

router.get('/dealers/export', requireAuth, asyncHandler(async function(req, res) {
  const dealers = await prisma.dealer.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 });
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename=dealers-' + new Date().toISOString().slice(0, 10) + '.csv');
  res.send(toCSV(dealers, ['phone', 'name', 'dCode', 'trusted', 'active', 'createdAt']));
}));

router.post('/customers', requireAuth, upload.single('file'), asyncHandler(async function(req, res) {
  if (!req.file) return res.status(400).json({ error: 'CSV file required (field: file)' });
  const text = fs.readFileSync(req.file.path, 'utf8');
  try { fs.unlinkSync(req.file.path); } catch(e) {}
  const rows = parseCSV(text);
  if (!rows.length) return res.status(400).json({ error: 'No data rows found' });
  let created = 0; const errors = [];
  for (const row of rows) {
    const phone = (row.phone || row.Phone || '').replace(/[^0-9]/g, '');
    if (!phone) { errors.push({ row, error: 'Missing phone' }); continue; }
    try {
      await prisma.customer.upsert({
        where: { phone },
        update: { name: row.name || row.Name || undefined },
        create: { phone, name: row.name || row.Name || 'Customer', tier: row.tier || row.Tier || 'Bronze', promoOptIn: true }
      });
      created++;
    } catch(e) { errors.push({ row, error: e.message }); }
  }
  res.json({ imported: created, errors: errors.length, errorDetails: errors.slice(0, 10) });
}));

module.exports = router;