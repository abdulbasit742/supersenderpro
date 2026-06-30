// routes/surveyRoutes.js — Feedback #1: surveys + NPS/CSAT.
//
// Wire-up (server.js):
//   const surveys = require('./lib/feedback/surveys');
//   surveys.setSender(guardedSend);
//   surveys.setRecorder((p, ev) => require('./lib/crm/customer360').recordEvent(p, ev));
//   app.use('/api/surveys', require('./routes/surveyRoutes'));
//   // auto-send CSAT after delivery: delivery.setNotifier ... then surveys.send(csatId, phone)

const express = require('express');
const router = express.Router();

let surveys;
try { surveys = require('../lib/feedback/surveys'); } catch { surveys = null; }

function ensure(res) {
  if (!surveys) { res.status(503).json({ ok: false, error: 'Surveys not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, surveys: surveys.listSurveys() });
});

// Create. Body: { type:'nps'|'csat'|'open', question, name? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, survey: surveys.createSurvey(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Send to a contact. Body: { phone }
router.post('/:id/send', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...(await surveys.send(req.params.id, (req.body || {}).phone)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Record a response. Body: { phone, value }
router.post('/:id/respond', (req, res) => {
  if (!ensure(res)) return;
  const { phone, value } = req.body || {};
  const out = surveys.recordResponse(req.params.id, phone, value);
  if (!out) return res.status(404).json({ ok: false, error: 'Survey not found' });
  res.json({ ok: out.ok !== false, ...out });
});

// Results / score.
router.get('/:id/results', (req, res) => {
  if (!ensure(res)) return;
  const r = surveys.results(req.params.id);
  if (!r) return res.status(404).json({ ok: false, error: 'Survey not found' });
  res.json({ ok: true, results: r });
});

module.exports = router;
