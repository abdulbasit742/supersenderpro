'use strict';
// routes/socialRoutes.js — Express router for real social connections. Mount at /api/social.
//
//   GET    /api/social/connect/:platform   -> { url } to start Facebook Login (?redirect=1 to 302)
//   GET    /api/social/callback            -> OAuth redirect target; verifies state, stores accounts
//   GET    /api/social/accounts            -> connected accounts (NO tokens)
//   POST   /api/social/publish             -> { accountId, message, imageUrl?, link? } -> real post
//   POST   /api/social/test/:platform      -> config + connection check
//   DELETE /api/social/accounts/:id        -> disconnect an account
//
// platform is one of: facebook, instagram (both go through Meta/Facebook Login).

const express = require('express');
const router = express.Router();
const oauth = require('../lib/socialOAuth');
const socialHub = require('../integrations/socialHub');

// storeId lets one deployment hold multiple businesses; default to 'default' for single-tenant.
function storeOf(req) {
  return String(req.query.storeId || req.body?.storeId || req.headers['x-store-id'] || 'default');
}

router.get('/status', (req, res) => {
  res.json({ ok: true, configured: oauth.isConfigured(), graphVersion: oauth.GRAPH_VERSION, scopes: oauth.DEFAULT_SCOPES });
});

// Start the OAuth flow. Frontend can either read { url } or hit with ?redirect=1 to be 302'd.
router.get('/connect/:platform', (req, res) => {
  const platform = String(req.params.platform || '').toLowerCase();
  if (!['facebook', 'instagram', 'meta'].includes(platform)) {
    return res.status(400).json({ ok: false, error: `Unsupported platform "${platform}". Facebook and Instagram are supported (both via Facebook Login).` });
  }
  if (!oauth.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'Facebook app not configured. Set FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI. See docs/SOCIAL_OAUTH_SETUP.md' });
  }
  try {
    const url = oauth.getAuthUrl(storeOf(req));
    if (String(req.query.redirect || '') === '1') return res.redirect(url);
    res.json({ ok: true, url });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Facebook redirects back here with ?code & ?state (or ?error on user cancel).
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  if (error) {
    return res.status(400).send(`Social connection cancelled: ${error_description || error}`);
  }
  const verified = oauth.verifyState(state);
  if (!verified) return res.status(400).send('Invalid or expired OAuth state. Please try connecting again.');
  try {
    const accounts = await oauth.completeConnect(verified.storeId, code);
    // Bounce the user back to the app's connections page with a success flag.
    const back = process.env.SOCIAL_SUCCESS_REDIRECT || '/connections.html?social=connected';
    const sep = back.includes('?') ? '&' : '?';
    return res.redirect(`${back}${sep}count=${accounts.length}`);
  } catch (e) {
    return res.status(500).send(`Could not finish connecting: ${e.message}`);
  }
});

router.get('/accounts', (req, res) => {
  res.json({ ok: true, accounts: oauth.publicAccounts(storeOf(req)) });
});

router.post('/publish', async (req, res) => {
  const { accountId, message, imageUrl, link } = req.body || {};
  if (!accountId) return res.status(400).json({ ok: false, error: 'accountId is required (from /api/social/accounts)' });
  if (!message && !imageUrl) return res.status(400).json({ ok: false, error: 'Provide a message and/or imageUrl' });
  try {
    const result = await socialHub.publish(storeOf(req), accountId, { message, imageUrl, link });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/test/:platform', async (req, res) => {
  const platform = String(req.params.platform || '').toLowerCase();
  const accounts = oauth.publicAccounts(storeOf(req)).filter(a => a.platform === platform);
  res.json({
    ok: true,
    configured: oauth.isConfigured(),
    platform,
    connectedAccounts: accounts.length,
    accounts
  });
});

router.delete('/accounts/:id', (req, res) => {
  const out = oauth.disconnect(storeOf(req), req.params.id);
  res.json({ ok: true, ...out });
});

module.exports = router;
