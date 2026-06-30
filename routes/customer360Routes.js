// routes/customer360Routes.js — CRM #1: Customer 360 profiles.
//
// Wire-up (server.js):
//   app.use('/api/crm/profiles', require('./routes/customer360Routes'));
//
// Feed it from existing flows so the profile is always current:
//   - on inbound/outbound message: c360.recordEvent(phone, { type:'message', text })
//   - on order:                    c360.recordEvent(phone, { type:'order', amount, ref:orderId })
//   - on payment (fulfillment #1): c360.recordEvent(phone, { type:'payment', amount, ref })
// Then point the marketing segment loader at c360.asSegmentContacts() so segments target real stats.

const express = require('express');
const router = express.Router();

let c360;
try { c360 = require('../lib/crm/customer360'); } catch { c360 = null; }

function ensure(res) {
  if (!c360) { res.status(503).json({ ok: false, error: 'Customer 360 not available' }); return false; }
  return true;
}

// List all profiles (lightweight — stats only, no full timeline).
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  const rows = c360.listProfiles().map(p => ({ key: p.key, name: p.name, phone: p.phone, stage: p.stage, stats: p.stats, tags: p.tags }));
  res.json({ ok: true, profiles: rows });
});

// Full profile (id = phone or wa id).
router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const p = c360.getProfile(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'No profile' });
  res.json({ ok: true, profile: p });
});

// Timeline only. Query: ?limit=
router.get('/:id/timeline', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, timeline: c360.getTimeline(req.params.id, Number(req.query.limit) || 100) });
});

// Create/update identity fields. Body: { name?, email?, stage?, tags?, optedIn? }
router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, profile: c360.upsertProfile(req.params.id, req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Record an event. Body: { type, amount?, text?, ref?, meta?, at? }
router.post('/:id/events', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, profile: c360.recordEvent(req.params.id, req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
