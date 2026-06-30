// routes/leadCaptureRoutes.js — Lead Capture #1: forms + intake.
//
// Wire-up (server.js):
//   const leads = require('./lib/leads/leadCapture');
//   const c360 = require('./lib/crm/customer360');
//   leads.setProfileUpsert((phone, fields) => c360.upsertProfile(phone, fields));
//   leads.setProfileSink((phone, ev) => c360.recordEvent(phone, ev));
//   leads.setEventEmitter((event, ctx) => require('./lib/workflows/workflowEngine').emit(event, ctx));
//   app.use('/api/leads', require('./routes/leadCaptureRoutes'));
//
// The public submit endpoint (POST /api/leads/forms/:id/submit) is what a landing page posts to.

const express = require('express');
const router = express.Router();

let leads;
try { leads = require('../lib/leads/leadCapture'); } catch { leads = null; }

function ensure(res) {
  if (!leads) { res.status(503).json({ ok: false, error: 'Lead capture not available' }); return false; }
  return true;
}

// --- Forms ---
router.post('/forms', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, form: leads.createForm(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});
router.get('/forms', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, forms: leads.listForms() });
});

// Public form submission (landing page posts here). Body: { name, phone, email, utm?, ... }
router.post('/forms/:id/submit', (req, res) => {
  if (!ensure(res)) return;
  try {
    const out = leads.submitForm(req.params.id, req.body || {});
    const form = leads.getForm(req.params.id);
    res.json({ ok: true, ...out, redirectUrl: form ? form.redirectUrl : null });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// --- Direct capture (click-to-whatsapp, qr, api) ---
// Body: { name?, phone?, email?, source?, utm?, tags? }
router.post('/capture', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...leads.capture(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// --- Leads ---
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, leads: leads.listLeads({ status: req.query.status, source: req.query.source }) });
});
router.get('/stats', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, stats: leads.stats() });
});
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  try {
    const lead = leads.setLeadStatus(req.params.id, (req.body || {}).status);
    if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' });
    res.json({ ok: true, lead });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
