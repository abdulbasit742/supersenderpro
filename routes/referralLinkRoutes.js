// routes/referralLinkRoutes.js — Growth #1: referral share links.
//
// Wire-up (server.js):
//   const ref = require('./routes/referralLinkRoutes');
//   app.use('/api/referrals', ref.api);
//   app.use('/r', ref.redirect);  // public click handler: GET /r/:id -> records click -> 302 to wa.me
//
// Create a link using the loyalty code:
//   const code = require('./lib/marketing/loyaltyEngine').getOrCreateReferralCode({ phone });
//   require('./lib/growth/referralLinks').createLink({ referrerPhone: phone, code });

const express = require('express');

let links;
try { links = require('../lib/growth/referralLinks'); } catch { links = null; }

// --- API ---
const api = express.Router();
function ensure(res) {
  if (!links) { res.status(503).json({ ok: false, error: 'Referral links not available' }); return false; }
  return true;
}

// Create a link. Body: { referrerPhone, code, businessWaNumber?, baseUrl?, prefillText? }
api.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, link: links.createLink(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Links for a referrer. /api/referrals/by/:phone
api.get('/by/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, links: links.linksFor(req.params.phone) });
});

// Leaderboard.
api.get('/leaderboard', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, leaderboard: links.leaderboard(Number(req.query.limit) || 10) });
});

// Attribute a signup. Body: { linkId }
api.post('/signup', (req, res) => {
  if (!ensure(res)) return;
  const l = links.recordSignup((req.body || {}).linkId);
  if (!l) return res.status(404).json({ ok: false, error: 'Link not found' });
  res.json({ ok: true, link: l });
});

// --- Public redirect ---
const redirect = express.Router();
redirect.get('/:id', (req, res) => {
  if (!links) return res.status(503).send('unavailable');
  const out = links.recordClick(req.params.id, { ref: req.query.ref });
  if (!out) return res.status(404).send('link not found');
  if (out.redirectTo) return res.redirect(302, out.redirectTo);
  res.send('Thanks! Message us to continue.');
});

module.exports = { api, redirect };
