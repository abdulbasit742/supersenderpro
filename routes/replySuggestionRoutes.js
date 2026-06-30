// routes/replySuggestionRoutes.js — Inbox #3: AI reply suggestions.
//
// Wire-up (server.js) — connect inbox, KB, canned, 360, AI:
//   const rs = require('./lib/inbox/replySuggestions');
//   rs.configure({
//     getThread:    (p) => require('./lib/inbox/inbox').getThread(p),
//     getProfile:   (p) => require('./lib/crm/customer360').getProfile(p),
//     kbSearch:     (q) => require('./lib/support/knowledgeBase').search(q, 5),
//     cannedSearch: (q) => require('./lib/inbox/cannedReplies').search(q)
//   });
//   app.use('/api/inbox/suggestions', require('./routes/replySuggestionRoutes'));

const express = require('express');
const router = express.Router();

let rs;
try { rs = require('../lib/inbox/replySuggestions'); } catch { rs = null; }

// Suggest replies for a thread. /api/inbox/suggestions/:phone  (optional ?message= override)
router.get('/:phone', async (req, res) => {
  if (!rs) return res.status(503).json({ ok: false, error: 'Suggestions not available' });
  try {
    const out = await rs.suggest(req.params.phone, { message: req.query.message });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
