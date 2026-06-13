const express = require('express');
const multer = require('multer');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/phone');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

function parseCsv(buffer) {
  const text = buffer.toString('utf8');
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  return lines.map(line => {
    const cells = line.split(',').map(c => c.trim());
    return headers.reduce((row, key, i) => ({ ...row, [key]: cells[i] || '' }), {});
  });
}

router.get('/', asyncHandler(async (req, res) => {
  const { q = '', tool = '', priority, scammer, minReliability } = req.query;
  const dealers = await prisma.dealer.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: String(q) } }, { whatsappNumber: { contains: String(q) } }, { groupName: { contains: String(q) } }] } : {}),
      ...(priority === 'true' ? { priority: true } : {}),
      ...(scammer === 'true' ? { isScammer: true } : {}),
      ...(minReliability ? { reliabilityScore: { gte: Number(minReliability) } } : {})
    },
    include: { purchases: { take: 5, orderBy: { purchaseDate: 'desc' } }, rates: { take: 5, orderBy: { rateDate: 'desc' } } },
    orderBy: [{ priority: 'desc' }, { isScammer: 'asc' }, { reliabilityScore: 'desc' }, { name: 'asc' }]
  });
  const filtered = tool
    ? dealers.filter(d => JSON.stringify(d.toolsAvailable || '').toLowerCase().includes(String(tool).toLowerCase()))
    : dealers;
  res.json(filtered);
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const dealer = await prisma.dealer.upsert({
    where: { whatsappNumber: normalizePhone(body.whatsappNumber || body.whatsapp_number) },
    update: {
      name: body.name,
      groupName: body.groupName || body.group_name || null,
      toolsAvailable: body.toolsAvailable || body.tools_available || [],
      reliabilityScore: Number(body.reliabilityScore || body.reliability_score || 70),
      priority: Boolean(body.priority),
      isScammer: Boolean(body.isScammer || body.is_scammer),
      scamNotes: body.scamNotes || body.scam_notes || null,
      notes: body.notes || null,
      tags: body.tags || []
    },
    create: {
      name: body.name || 'Unnamed Dealer',
      whatsappNumber: normalizePhone(body.whatsappNumber || body.whatsapp_number),
      groupName: body.groupName || body.group_name || null,
      toolsAvailable: body.toolsAvailable || body.tools_available || [],
      reliabilityScore: Number(body.reliabilityScore || body.reliability_score || 70),
      priority: Boolean(body.priority),
      isScammer: Boolean(body.isScammer || body.is_scammer),
      scamNotes: body.scamNotes || body.scam_notes || null,
      notes: body.notes || null,
      tags: body.tags || []
    }
  });
  res.status(201).json(dealer);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const dealer = await prisma.dealer.update({
    where: { id: req.params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.whatsappNumber !== undefined ? { whatsappNumber: normalizePhone(body.whatsappNumber) } : {}),
      ...(body.groupName !== undefined ? { groupName: body.groupName } : {}),
      ...(body.toolsAvailable !== undefined ? { toolsAvailable: body.toolsAvailable } : {}),
      ...(body.reliabilityScore !== undefined ? { reliabilityScore: Number(body.reliabilityScore) } : {}),
      ...(body.priority !== undefined ? { priority: Boolean(body.priority) } : {}),
      ...(body.isScammer !== undefined ? { isScammer: Boolean(body.isScammer) } : {}),
      ...(body.scamNotes !== undefined ? { scamNotes: body.scamNotes } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {})
    }
  });
  res.json(dealer);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.dealer.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.post('/import-csv', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const rows = parseCsv(req.file.buffer);
  let imported = 0;
  for (const row of rows) {
    const phone = normalizePhone(row.whatsapp || row.whatsapp_number || row.phone || row.number);
    if (!phone) continue;
    await prisma.dealer.upsert({
      where: { whatsappNumber: phone },
      update: {
        name: row.name || row.dealer || 'Dealer',
        groupName: row.group_name || row.group || null,
        toolsAvailable: row.tools ? row.tools.split('|').map(x => x.trim()) : []
      },
      create: {
        name: row.name || row.dealer || 'Dealer',
        whatsappNumber: phone,
        groupName: row.group_name || row.group || null,
        toolsAvailable: row.tools ? row.tools.split('|').map(x => x.trim()) : []
      }
    });
    imported++;
  }
  res.json({ success: true, imported });
}));

router.get('/:id/performance', asyncHandler(async (req, res) => {
  const [dealer, purchases, rates] = await Promise.all([
    prisma.dealer.findUnique({ where: { id: req.params.id } }),
    prisma.purchase.findMany({ where: { dealerId: req.params.id }, orderBy: { purchaseDate: 'desc' } }),
    prisma.rateEntry.findMany({ where: { dealerId: req.params.id }, orderBy: { rateDate: 'desc' }, take: 60 })
  ]);
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  res.json({
    dealer,
    totalOrders: purchases.length,
    totalAmount: purchases.reduce((sum, p) => sum + Number(p.totalCost || 0), 0),
    avgBuyPrice: rates.length ? rates.reduce((sum, r) => sum + Number(r.buyPrice || 0), 0) / rates.length : 0,
    rates
  });
}));

module.exports = router;
