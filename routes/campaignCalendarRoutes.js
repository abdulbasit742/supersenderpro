// routes/campaignCalendarRoutes.js — Marketing #8: campaign calendar.
//
// Wire-up (server.js):
//   app.use('/api/marketing/calendar', require('./routes/campaignCalendarRoutes'));

const express = require('express');
const router = express.Router();

let cal;
try { cal = require('../lib/marketing/campaignCalendar'); } catch { cal = null; }

function ensure(res) {
  if (!cal) { res.status(503).json({ ok: false, error: 'Calendar not available' }); return false; }
  return true;
}

// Month view. Query: ?ym=YYYY-MM
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, entries: cal.month(req.query.ym), heatmap: cal.heatmap(req.query.ym) });
});

// Schedule. Body: { title, date, time?, segmentId?, type?, notes? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...cal.schedule(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...cal.remove(req.params.id) });
});

// Config. Body: { maxPerDay }
router.post('/config', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, config: cal.configure(req.body || {}) });
});

module.exports = router;
