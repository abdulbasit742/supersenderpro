'use strict';
/**
 * routes/marketplaceIntelligenceRoutes.js — Marketplace Intelligence API.
 * Mounted in server.js at /api/marketplace-intelligence (see MARKETPLACE INTELLIGENCE HOOK).
 *
 * Write/live actions are dry-run by default and protected by an admin secret
 * (x-admin-secret header / ?secret=) matching MARKETPLACE_ADMIN_SECRET or
 * CHANNEL_ADMIN_SECRET or ADMIN_TOKEN. If none configured, allowed in dev with a warning.
 */
const express = require('express');
const mi = require('../lib/marketplaceIntelligence');

const router = express.Router();

function adminGuard(req, res, next) {
  const configured = process.env.MARKETPLACE_ADMIN_SECRET || process.env.CHANNEL_ADMIN_SECRET || process.env.ADMIN_TOKEN || '';
  if (!configured) { console.warn('[MarketplaceIntel] no admin secret set — write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching MARKETPLACE_ADMIN_SECRET' });
}
const ok = (res, d) => res.json({ success: true, ...d });
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });

router.get('/status', (req, res) => { try { ok(res, { status: mi.status() }); } catch (e) { fail(res, e); } });
router.get('/graph', (req, res) => { try { ok(res, { graph: mi.graphView() }); } catch (e) { fail(res, e); } });
router.get('/entities', (req, res) => { try { ok(res, { entities: mi.entities(req.query.type) }); } catch (e) { fail(res, e); } });
router.get('/entities/:id', (req, res) => { try { ok(res, mi.entity(req.params.id)); } catch (e) { fail(res, e); } });
router.get('/sellers', (req, res) => { try { ok(res, { sellers: mi.sellers() }); } catch (e) { fail(res, e); } });
router.get('/buyers', (req, res) => { try { ok(res, { buyers: mi.buyers() }); } catch (e) { fail(res, e); } });
router.get('/skus', (req, res) => { try { ok(res, { skus: mi.skus() }); } catch (e) { fail(res, e); } });
router.get('/prices', (req, res) => { try { ok(res, { prices: mi.prices() }); } catch (e) { fail(res, e); } });
router.get('/stock', (req, res) => { try { ok(res, { stock: mi.stock() }); } catch (e) { fail(res, e); } });
router.get('/opportunities', (req, res) => { try { ok(res, { opportunities: mi.opportunities() }); } catch (e) { fail(res, e); } });
router.get('/matches', (req, res) => { try { ok(res, { matches: mi.matches() }); } catch (e) { fail(res, e); } });
router.get('/recommendations', async (req, res) => { try { ok(res, await mi.recommendations()); } catch (e) { fail(res, e); } });
router.post('/recommendations/generate', adminGuard, async (req, res) => { try { ok(res, await mi.recommendations()); } catch (e) { fail(res, e); } });
router.get('/digest', (req, res) => { try { ok(res, { digest: mi.digest() }); } catch (e) { fail(res, e); } });
router.post('/digest/generate', adminGuard, (req, res) => { try { ok(res, { digest: mi.digest() }); } catch (e) { fail(res, e); } });
router.get('/history', (req, res) => { try { ok(res, { history: mi.history().slice(-Number(req.query.limit || 100)) }); } catch (e) { fail(res, e); } });
router.get('/report', (req, res) => {
  try {
    const { kind = 'all', format = 'json' } = req.query;
    const out = mi.report(kind, format);
    if (format === 'csv') { res.type('text/plain'); return res.send(typeof out === 'string' ? out : JSON.stringify(out)); }
    if (format === 'markdown') { res.type('text/markdown'); return res.send(out); }
    ok(res, { report: out });
  } catch (e) { fail(res, e); }
});
router.post('/search', (req, res) => { try { const { query = '', ...opts } = req.body || {}; ok(res, { results: mi.search(query, opts) }); } catch (e) { fail(res, e); } });

// Write: ingest a normalized source payload (dry-run safe). { sourceType, payload }
router.post('/ingest', adminGuard, (req, res) => {
  try {
    const { sourceType, payload } = req.body || {};
    if (!sourceType || payload == null) return fail(res, 'sourceType and payload required', 400);
    ok(res, { result: mi.ingest(sourceType, payload) });
  } catch (e) { fail(res, e); }
});

module.exports = router;
