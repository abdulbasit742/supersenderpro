// routes/autoTagRoutes.js — AI #2: conversation auto-tagging.
//
// Wire-up (server.js) — apply tags to Customer 360, run in the message router on inbound:
//   const tagger = require('./lib/ai/autoTagger');
//   tagger.setApplyTags((phone, tags) => require('./lib/crm/customer360').upsertProfile(phone, { tags }));
//   // in messageRouter: tagger.tagMessage(phone, text);  (fire-and-forget)
//   app.use('/api/ai/tagging', require('./routes/autoTagRoutes'));

const express = require('express');
const router = express.Router();

let tagger;
try { tagger = require('../lib/ai/autoTagger'); } catch { tagger = null; }

function ensure(res) {
  if (!tagger) { res.status(503).json({ ok: false, error: 'Auto-tagger not available' }); return false; }
  return true;
}

// Classify only (no tagging). Body: { text }
router.post('/classify', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, classification: await tagger.classify((req.body || {}).text) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Classify + apply tags. Body: { phone, text }
router.post('/tag', async (req, res) => {
  if (!ensure(res)) return;
  const { phone, text } = req.body || {};
  try { res.json({ ok: true, ...(await tagger.tagMessage(phone, text)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
