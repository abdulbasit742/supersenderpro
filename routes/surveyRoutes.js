// routes/surveyRoutes.js
// Self-mountable Express router for the WhatsApp survey & poll engine.
// Mount in server.js with a single line:
//     app.use('/api/surveys', require('./routes/surveyRoutes'));

const express = require('express');
const router = express.Router();
const surveys = require('../lib/surveys/surveyEngine');

// POST /api/surveys/define   Body: { storeId?, id, name?, steps:[{type,q,options?,min?,max?,nps?}] }
router.post('/define', (req, res) => {
  try { res.json({ success: true, survey: surveys.defineSurvey({ storeId: 'default_store', ...(req.body || {}) }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/surveys/list?storeId=
router.get('/list', (req, res) => {
  try { res.json({ success: true, surveys: surveys.listSurveys({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/surveys/start   Body: { storeId?, phone, surveyId }
router.post('/start', (req, res) => {
  try {
    const { storeId = 'default_store', phone, surveyId } = req.body || {};
    if (!phone || !surveyId) return res.status(400).json({ success: false, error: 'phone and surveyId are required' });
    const r = surveys.start({ storeId, phone, surveyId });
    res.status(r.ok ? 200 : 404).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/surveys/answer   Body: { storeId?, phone, surveyId, text }
router.post('/answer', (req, res) => {
  try {
    const { storeId = 'default_store', phone, surveyId, text } = req.body || {};
    if (!phone || !surveyId) return res.status(400).json({ success: false, error: 'phone and surveyId are required' });
    const r = surveys.answer({ storeId, phone, surveyId, text });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/surveys/results?storeId=&surveyId=
router.get('/results', (req, res) => {
  try {
    const { storeId = 'default_store', surveyId } = req.query;
    if (!surveyId) return res.status(400).json({ success: false, error: 'surveyId is required' });
    const r = surveys.results({ storeId, surveyId });
    res.status(r.ok ? 200 : 404).json({ success: r.ok, ...r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/surveys/insights?storeId=&surveyId=   (results + AI summary)
router.get('/insights', async (req, res) => {
  try {
    const { storeId = 'default_store', surveyId } = req.query;
    if (!surveyId) return res.status(400).json({ success: false, error: 'surveyId is required' });
    const r = await surveys.insights({ storeId, surveyId });
    res.status(r.ok === false ? 404 : 200).json({ success: r.ok !== false, ...r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/surveys/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...surveys.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
