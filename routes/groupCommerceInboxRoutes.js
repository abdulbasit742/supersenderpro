 'use strict';

 /**
     * Group Commerce Inbox — Express router.
     *
     * Mount in server.js (inside the marked hook):
     *   const groupCommerceInboxRoutes = require('./routes/groupCommerceInboxRoutes');
     *        app.use('/api/group-commerce/inbox', groupCommerceInboxRoutes);
     *
     * SAFETY: dry-run + preview only. No sends/posts/deletes/removals/ecommerce writes.
     * PII masked at the store layer. Raw bodies not stored unless STORE_RAW=true.
     */

 const express = require('express');
 const router = express.Router();

 const store = require('../lib/groupCommerce/inbox/store');
 const aggregator = require('../lib/groupCommerce/inbox/aggregator');
 const filters = require('../lib/groupCommerce/inbox/filters');
 const marketSummary = require('../lib/groupCommerce/inbox/marketSummary');
 const actionSuggestions = require('../lib/groupCommerce/inbox/actionSuggestions');

 function enabled() {
         return String(process.env.GROUP_COMMERCE_INBOX_ENABLED || 'true').toLowerCase() !== 'false';
 }
 function dryRun() {
   return String(process.env.GROUP_COMMERCE_INBOX_DRY_RUN || 'true').toLowerCase() !== 'false';
 }

 router.use(function (req, res, next) {
   if (!enabled()) return res.status(404).json({ ok: false, error: 'inbox_disabled' });
   next();
 });

 function wrap(handler) {
         return function (req, res) {
           try { handler(req, res); }
           catch (e) { res.status(500).json({ ok: false, error: 'internal_error' }); }
         };
 }


 // Build filter criteria from query OR body.
 function criteriaFrom(src) {
         const s = src || {};
         return {
           groupId: s.groupId, type: s.type, roleIntent: s.roleIntent, sku: s.sku, product: s.product,
           sellerIdMasked: s.sellerIdMasked, buyerIdMasked: s.buyerIdMasked, riskLevel: s.riskLevel,

     minConfidence: s.minConfidence, maxConfidence: s.maxConfidence, from: s.from, to: s.to,
     unresolvedOnly: s.unresolvedOnly === true || s.unresolvedOnly === 'true',
     highValueOnly: s.highValueOnly === true || s.highValueOnly === 'true',
     suspiciousOnly: s.suspiciousOnly === true || s.suspiciousOnly === 'true',
     minPrice: s.minPrice, query: s.query,
   };
}

// GET /status
router.get('/status', wrap(function (req, res) {
 res.json({
     ok: true,
     feature: 'group-commerce-inbox',
     enabled: enabled(),
     dryRun: dryRun(),
     autoActions: actionSuggestions.AUTO_ACTIONS,
     store: store.status(),
     allowedTypes: store.ALLOWED_TYPES,
     sorts: filters.SORTS,
 });
}));

// GET /items
router.get('/items', wrap(function (req, res) {
 const items = filters.query(store.list(), criteriaFrom(req.query), req.query.sort, req.query.limit);
 res.json({ ok: true, count: items.length, items: items });
}));

// POST /items    (manual add of an already-normalized-ish record)
router.post('/items', wrap(function (req, res) {
 const rec = store.add(req.body || {});
 res.status(201).json({ ok: true, item: rec });
}));


// GET /items/:id
router.get('/items/:id', wrap(function (req, res) {
 const item = store.getById(req.params.id);
 return item ? res.json({ ok: true, item: item }) : res.status(404).json({ ok: false, error: 'not_found' });
}));


// PUT /items/:id
router.put('/items/:id', wrap(function (req, res) {
 const item = store.update(req.params.id, req.body || {});
 return item ? res.json({ ok: true, item: item }) : res.status(404).json({ ok: false, error: 'not_found' });
}));

// DELETE /items/:id
router.delete('/items/:id', wrap(function (req, res) {
 const removed = store.remove(req.params.id);
 res.status(removed ? 200 : 404).json({ ok: removed, removed: removed });
}));


// POST /ingest    (analyzed group commerce output -> normalized inbox item)
router.post('/ingest', wrap(function (req, res) {
 const body = req.body || {};
   if (Array.isArray(body.items)) {
     const recs = aggregator.ingestMany(body.items);

   return res.status(201).json({ ok: true, ingested: recs.length, items: recs });
 }
 const rec = aggregator.ingest(body);
 res.status(201).json({ ok: true, item: rec });
}));

// POST /search
router.post('/search', wrap(function (req, res) {
 const body = req.body || {};
 const items = filters.query(store.list(), criteriaFrom(body), body.sort, body.limit);
 res.json({ ok: true, count: items.length, items: items });
}));

// GET /summary
router.get('/summary', wrap(function (req, res) {
 const items = filters.apply(store.list(), criteriaFrom(req.query));
 res.json(Object.assign({ ok: true }, marketSummary.summarize(items)));
}));


// POST /items/:id/suggest-actions
router.post('/items/:id/suggest-actions', wrap(function (req, res) {
 const item = store.getById(req.params.id);
 if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
 const out = actionSuggestions.suggestForItem(item);
 // Persist suggested action labels back onto the item (drafts only).
 store.update(item.id, { suggestedActions: out.suggestions.map(function (s) { return s.type; }) });
 res.json(Object.assign({ ok: true, id: item.id }, out));
}));


// POST /items/:id/resolve
router.post('/items/:id/resolve', wrap(function (req, res) {
 const item = store.update(req.params.id, { resolved: true });
 return item ? res.json({ ok: true, item: item }) : res.status(404).json({ ok: false, error: 'not_found' });
}));

module.exports = router;
