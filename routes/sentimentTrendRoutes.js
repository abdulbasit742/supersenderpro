'use strict';
// Self-mountable router for AI Sentiment Trend Monitor (#120).
// Usage: require('./routes/sentimentTrendRoutes')(app)  OR  app.use(require(...).router)

const express = require('express');
const st = require('../lib/sentimentTrend/sentimentTrend');

function getTenant(req) {
  return req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || (req.query && req.query.tenantId);
}

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true, feature: 'ai-sentiment-trend', ts: Date.now() }));

router.post('/record', (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { text, contactId, ts } = req.body || {};
    const ev = st.record(tenantId, { text, contactId, ts });
    res.json({ ok: true, event: ev });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/trend', (req, res) => {
  try {
    const tenantId = getTenant(req);
    const sinceMs = req.query.sinceMs ? Number(req.query.sinceMs) : undefined;
    res.json({ ok: true, stats: st.windowStats(tenantId, sinceMs ? { sinceMs } : {}) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/alerts', (req, res) => {
  try {
    const tenantId = getTenant(req);
    res.json({ ok: true, ...st.detectSpike(tenantId, {}) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/summary', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    res.json({ ok: true, ...(await st.summarize(tenantId, {})) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

function mount(app, base) {
  app.use(base || '/api/ai/sentiment-trend', router);
  return app;
}

module.exports = mount;
module.exports.router = router;
module.exports.mount = mount;
