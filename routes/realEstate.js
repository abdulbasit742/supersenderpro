// realEstate.js – REST surface for the real-estate vertical.
// Mount in server.js:  app.use('/realestate', require('./routes/realEstate'));
// Additive: does not alter existing routes.
const express = require('express');
const router = express.Router();
const {
  handleRealEstateConversation,
  propertiesForTenant
} = require('../ai/agents/realEstateAgent');

// Resolve tenant from header/body/query. Adjust to your auth middleware
// (lib/auth) once wired; kept permissive here for the feature branch.
function resolveTenantId(req) {
  return (
    req.headers['x-tenant-id'] ||
    (req.body && req.body.tenantId) ||
    (req.query && req.query.tenantId) ||
    null
  );
}

// POST /realestate/ask  { message, phone?, languageCode?, tenantId? }
router.post('/ask', async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Missing tenantId (tenant isolation)' });
    const { message, phone = 'web', languageCode = 'und' } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Missing message' });
    const result = await handleRealEstateConversation(phone, message, { tenantId, languageCode });
    res.json(result);
  } catch (e) {
    console.error('[realEstate] /ask error:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /realestate/properties?tenantId=...
router.get('/properties', (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Missing tenantId (tenant isolation)' });
    res.json({ properties: propertiesForTenant(tenantId) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
