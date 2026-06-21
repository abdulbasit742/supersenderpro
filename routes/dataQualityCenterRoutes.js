  'use strict';

  const express = require('express');
  const router = express.Router();

  const store = require('../lib/dataQualityCenter/store');
  const scanner = require('../lib/dataQualityCenter/dataQualityScanner');
  const dup = require('../lib/dataQualityCenter/duplicateDetector');
  const productChecks = require('../lib/dataQualityCenter/productQualityChecks');
  const customerChecks = require('../lib/dataQualityCenter/customerQualityChecks');
  const supplierChecks = require('../lib/dataQualityCenter/supplierQualityChecks');
  const financeChecks = require('../lib/dataQualityCenter/financeQualityChecks');
  const inventoryChecks = require('../lib/dataQualityCenter/inventoryConsistencyChecks');
  const cleanup = require('../lib/dataQualityCenter/cleanupRecommendation');
  const mergePreview = require('../lib/dataQualityCenter/mergePreview');
  const scoreEngine = require('../lib/dataQualityCenter/qualityScore');

  function wrap(handler) {
    return (req, res) => {
        try {
          const result = handler(req, res);
            if (result && typeof result.then === 'function') {
              result.catch(() => res.status(500).json({ ok: false, error: 'internal error' }));
          }
        } catch (_) {
            res.status(500).json({ ok: false, error: 'internal error' });
        }
      };
  }

  // 1. status
  router.get('/status', wrap((req, res) => {
    res.json({ ok: true, dryRun: scanner.DRY_RUN, lastScan: store.lastScan() });
  }));

  // 2. issues (all cached)
  router.get('/issues', wrap((req, res) => {
    res.json({ ok: true, issues: store.listIssues() });
  }));

  // 3. single issue
  router.get('/issues/:id', wrap((req, res) => {
    const issue = store.getIssue(req.params.id);
      if (!issue) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, issue });
  }));


// 4. full scan preview
router.get('/scan-preview', wrap((req, res) => {
 const entities = req.query.entities ? String(req.query.entities).split(',') : undefined;
 res.json({ ok: true, ...scanner.runScan({ entities }) });
}));


// 5. duplicate check preview (any entity via ?entity=)
router.get('/duplicate-check-preview', wrap((req, res) => {
 const entity = String(req.query.entity || 'product');
 const loaders = {
   product: () => ({ records: productChecks.loadProducts(), fields: ['sku', 'name'] }),
   customer: () => ({ records: customerChecks.loadCustomers(), fields: ['phone', 'email'] }),
   supplier: () => ({ records: supplierChecks.loadSuppliers(), fields: ['name', 'taxId'] }),
   finance: () => ({ records: financeChecks.loadInvoices(), fields: ['invoiceNo'] }),
 };
 const fn = loaders[entity] || loaders.product;
 const { records, fields } = fn();
 res.json({ ok: true, entity, groups: dup.findDuplicateGroups(records, fields, 'id') });
}));

// 6-10. per-entity check previews
router.get('/products/check-preview', wrap((req, res) => res.json({ ok: true, issues: productChecks.run() })));
router.get('/customers/check-preview', wrap((req, res) => res.json({ ok: true, issues: customerChecks.run() })));
router.get('/suppliers/check-preview', wrap((req, res) => res.json({ ok: true, issues: supplierChecks.run() })));
router.get('/finance/check-preview', wrap((req, res) => res.json({ ok: true, issues: financeChecks.run() })));
router.get('/inventory/check-preview', wrap((req, res) => res.json({ ok: true, issues: inventoryChecks.run() })));

// 11. cleanup recommendations preview (from cached issues, or fresh scan)
router.get('/cleanup-recommendations-preview', wrap((req, res) => {
 const issues = store.listIssues();
 const source = issues.length ? issues : scanner.runScan({}).issues;
 res.json({ ok: true, plan: cleanup.buildPlan(source) });
}));

// 12. merge preview for a duplicate group (?entity=&ids=1,2,3)
router.get('/merge-preview', wrap((req, res) => {
 const entity = String(req.query.entity || 'customer');
 const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
 const loaders = {
   product: () => productChecks.loadProducts(),
   customer: () => customerChecks.loadCustomers(),
   supplier: () => supplierChecks.loadSuppliers(),
   finance: () => financeChecks.loadInvoices(),
 };
 const all = (loaders[entity] || loaders.customer)();
 const records = all.filter((r) => ids.includes(String(r.id)));
 res.json({ ok: true, entity, preview: mergePreview.buildPreview(records) });
}));

// 13. quality score
router.get('/quality-score', wrap((req, res) => {
 res.json({ ok: true, score: scoreEngine.compute(store.listIssues()) });
}));


// 14. summary (dashboard rollup)
router.get('/summary', wrap((req, res) => {


 const issues = store.listIssues();
 const scoring = scoreEngine.compute(issues);
 res.json({
   ok: true,
   dryRun: scanner.DRY_RUN,
   lastScan: store.lastScan(),
   score: scoring,
   issueCount: issues.length,
   bySeverity: issues.reduce((a, i) => { a[i.severity] = (a[i.severity] || 0) + 1; return a; }, {}),
 });
}));


// 15. scan history
router.get('/scans', wrap((req, res) => res.json({ ok: true, scans: store.listScans() })));


module.exports = router;
