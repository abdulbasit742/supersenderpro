// routes/apiKeyRoutes.js — API #1: developer API key management + an example authed endpoint.
//
// Wire-up (server.js):
//   app.use('/api/keys', require('./routes/apiKeyRoutes'));
//
// Management endpoints here are dashboard-only (protect with your normal auth/RBAC). The example
// /v1/send shows how to gate a PUBLIC programmatic endpoint with an API key + scope.

const express = require('express');
const router = express.Router();

let apiKeys;
try { apiKeys = require('../lib/api/apiKeys'); } catch { apiKeys = null; }

function ensure(res) {
  if (!apiKeys) { res.status(503).json({ ok: false, error: 'API keys not available' }); return false; }
  return true;
}

// Issue a key. Body: { tenantId, name?, scopes? }  -> returns rawKey ONCE.
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { record, rawKey } = apiKeys.issueKey(req.body || {});
    res.json({ ok: true, key: record, rawKey, note: 'Store rawKey now; it will not be shown again.' });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List keys for a tenant. Query: ?tenantId=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, keys: apiKeys.listKeys(req.query.tenantId) });
});

// Revoke.
router.post('/:id/revoke', (req, res) => {
  if (!ensure(res)) return;
  const k = apiKeys.revokeKey(req.params.id);
  if (!k) return res.status(404).json({ ok: false, error: 'Key not found' });
  res.json({ ok: true, key: k });
});

// --- Example public programmatic endpoint, gated by an API key with 'send' scope ---
// A customer's backend POSTs here with Authorization: Bearer ssk_xxx
// Body: { phone, text }. Wire sendImpl in server.js to the guarded WA sender.
let sendImpl = null;
router.setSendImpl = (fn) => { sendImpl = typeof fn === 'function' ? fn : null; };
router.post('/v1/send', apiKeys ? apiKeys.authenticate('send') : (req, res) => res.status(503).json({ ok: false }), async (req, res) => {
  const { phone, text } = req.body || {};
  if (!phone || !text) return res.status(400).json({ ok: false, error: 'phone and text required' });
  if (!sendImpl) return res.status(503).json({ ok: false, error: 'send not wired' });
  try {
    const out = await sendImpl({ tenantId: req.apiAuth.tenantId, phone, text });
    res.json({ ok: true, result: out });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
