// routes/leadGenRoutes.js — REST surface for the Lead Gen & Capture department.
//
// Wire-up (server.js):
//   app.use('/api/leadgen', require('./routes/leadGenRoutes'));
//
// Public endpoints (safe to expose on landing pages):
//   POST /api/leadgen/forms/:id/submit     { name, phone, email, utm, meta }
//   POST /api/leadgen/magnets/:id/claim     { name, phone, email }
//   GET  /api/leadgen/click-to-whatsapp?phone=&message=&campaign=
//   GET  /api/leadgen/qr?type=whatsapp&phone=&message=&campaign=   (returns a PNG)
//
// Admin endpoints (put behind your auth/tenant middleware):
//   POST /api/leadgen/forms        GET /api/leadgen/forms
//   POST /api/leadgen/magnets      GET /api/leadgen/magnets
//   GET  /api/leadgen/leads        POST /api/leadgen/leads (manual capture)
//   PATCH /api/leadgen/leads/:id/status   { status }
//   GET  /api/leadgen/stats

const express = require('express');
const router = express.Router();

let leadGen;
try { leadGen = require('../lib/leadGen'); } catch (e) { leadGen = null; }

let QRCode = null;
try { QRCode = require('qrcode'); } catch { QRCode = null; }

function ensure(res) {
  if (!leadGen) { res.status(503).json({ ok: false, error: 'Lead gen module not available' }); return false; }
  return true;
}

// ---- Public: form submit -------------------------------------------------
router.post('/forms/:id/submit', (req, res) => {
  if (!ensure(res)) return;
  try {
    const result = leadGen.submitForm(req.params.id, req.body || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---- Public: claim a lead magnet ----------------------------------------
router.post('/magnets/:id/claim', (req, res) => {
  if (!ensure(res)) return;
  try {
    const result = leadGen.claimMagnet(req.params.id, req.body || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---- Public: click-to-WhatsApp link -------------------------------------
router.get('/click-to-whatsapp', (req, res) => {
  if (!ensure(res)) return;
  const { phone, message, campaign } = req.query;
  if (!phone) return res.status(400).json({ ok: false, error: 'phone is required' });
  res.json({ ok: true, ...leadGen.buildClickToWhatsApp({ phone, message, campaign }) });
});

// ---- Public: QR code image (PNG) ----------------------------------------
router.get('/qr', async (req, res) => {
  if (!ensure(res)) return;
  if (!QRCode) return res.status(503).json({ ok: false, error: 'qrcode dependency not installed' });
  try {
    const payload = leadGen.buildQrPayload({
      type: req.query.type || 'whatsapp',
      phone: req.query.phone,
      message: req.query.message,
      campaign: req.query.campaign,
      url: req.query.url
    });
    if (!payload) return res.status(400).json({ ok: false, error: 'nothing to encode' });
    const png = await QRCode.toBuffer(payload, { type: 'png', width: Number(req.query.size) || 320, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---- Admin: forms --------------------------------------------------------
router.post('/forms', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, form: leadGen.createForm(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});
router.get('/forms', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, forms: leadGen.listForms() });
});

// ---- Admin: magnets ------------------------------------------------------
router.post('/magnets', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, magnet: leadGen.createMagnet(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});
router.get('/magnets', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, magnets: leadGen.listMagnets() });
});

// ---- Admin: leads --------------------------------------------------------
router.get('/leads', (req, res) => {
  if (!ensure(res)) return;
  const { source, formId, limit } = req.query;
  res.json({ ok: true, leads: leadGen.listLeads({ source, formId, limit: Number(limit) || 0 }) });
});
router.post('/leads', (req, res) => {
  if (!ensure(res)) return;
  try {
    const result = leadGen.captureLead({ ...(req.body || {}), source: (req.body && req.body.source) || 'manual' });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});
router.patch('/leads/:id/status', (req, res) => {
  if (!ensure(res)) return;
  const lead = leadGen.updateLeadStatus(req.params.id, (req.body && req.body.status) || 'new');
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' });
  res.json({ ok: true, lead });
});

// ---- Admin: stats --------------------------------------------------------
router.get('/stats', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...leadGen.getStats() });
});

module.exports = router;
