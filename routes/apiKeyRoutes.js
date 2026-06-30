// routes/apiKeyRoutes.js — API #1: developer API key management + a sample authed endpoint.
//
// Wire-up (server.js):
//   app.use('/api/keys', require('./routes/apiKeyRoutes').management);
//   app.use('/api/v1', require('./routes/apiKeyRoutes').v1);   // key-authenticated public API
//
// The /api/v1 routes are what your CUSTOMERS call from their own systems with their API key.

const express = require('express');
const apiKeys = (() => { try { return require('../lib/api/apiKeys'); } catch { return null; } })();

// --- management routes (session/owner protected in your app) ---
const management = express.Router();
function ensure(res) {
  if (!apiKeys) { res.status(503).json({ ok: false, error: 'API keys not available' }); return false; }
  return true;
}

// Issue a key. Body: { tenantId, name?, scopes? }  -> returns raw key ONCE
management.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, apiKey: apiKeys.issueKey(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});
// List keys for a tenant. Query: ?tenantId=
management.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, keys: apiKeys.listKeys(req.query.tenantId) });
});
// Revoke.
management.post('/:id/revoke', (req, res) => {
  if (!ensure(res)) return;
  const k = apiKeys.revokeKey(req.params.id);
  if (!k) return res.status(404).json({ ok: false, error: 'Key not found' });
  res.json({ ok: true, key: k });
});

// --- public v1 API (key-authenticated) — what customers call ---
const v1 = express.Router();
if (apiKeys) {
  // health/whoami: any valid key
  v1.get('/me', apiKeys.requireApiKey(), (req, res) => {
    res.json({ ok: true, tenantId: req.tenantId, scopes: req.apiKey.scopes });
  });
  // sample send endpoint: requires 'send' scope. Body: { phone, text }
  // (wire the actual guarded sender in server.js; here we just validate + echo intent)
  v1.post('/messages', apiKeys.requireApiKey('send'), (req, res) => {
    const { phone, text } = req.body || {};
    if (!phone || !text) return res.status(400).json({ ok: false, error: 'phone and text required' });
    // In server.js, replace this with: await guardedSend(`${phone}@c.us`, text)
    res.json({ ok: true, queued: true, tenantId: req.tenantId, to: phone });
  });
}

module.exports = { management, v1 };
