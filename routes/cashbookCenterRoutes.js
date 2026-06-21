  'use strict';
  /**
   * routes/cashbookCenterRoutes.js — Cashbook + Bank Reconciliation + Payment
   * Matching API. Preview-only / dry-run. No real payment, no bank API, no refund,
   * no invoice send, no external calls, no secrets, no full PII. express.json() for POST.
   */
  const express = require('express');
  const router = express.Router();

  const service = require('../lib/cashbookCenter/cashbookService');
  const model = require('../lib/cashbookCenter/cashTransactionModel');
  const balancePreview = require('../lib/cashbookCenter/balancePreview');
  const unmatched = require('../lib/cashbookCenter/unmatchedTransactions');
  const paymentMatcher = require('../lib/cashbookCenter/paymentMatcher');
  const duplicateDetector = require('../lib/cashbookCenter/duplicateDetector');
  const reconciliationService = require('../lib/cashbookCenter/reconciliationService');
  const accountingLinkPreview = require('../lib/cashbookCenter/accountingLinkPreview');


  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }


  router.get('/status', wrap(function (req, res) {
    service.ensureSeeded();
    res.json({ ok: true, module: 'cashbook-center', dryRun: true, liveActionsEnabled: false, noBankCall: true,
  noPaymentAction: true, noRefund: true, externalCalls: false, transactions: service.list().length, warnings: [], blockers:
  [], timestamp: new Date().toISOString() });
  }));


  router.get('/transactions', wrap(function (req, res) { res.json({ ok: true, dryRun: true, transactions:
  service.list(req.query) }); }));
  router.post('/transactions', wrap(function (req, res) { res.json(service.create(req.body || {})); }));
  router.get('/transactions/:id', wrap(function (req, res) { const t = service.get(req.params.id); return t ? res.json({
  ok: true, dryRun: true, transaction: t }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
  router.put('/transactions/:id', wrap(function (req, res) { const r = service.update(req.params.id, req.body || {});
  return r.ok ? res.json(r) : res.status(404).json({ ok: false, errors: r.errors }); }));

  router.get('/unmatched', wrap(function (req, res) { res.json({ ok: true, dryRun: true, unmatched:
  unmatched.find(service.list()) }); }));

  router.post('/match-preview', wrap(function (req, res) {
    const b = req.body || {};
    const txn = service.get(b.transactionId);

 if (!txn) return res.status(404).json({ ok: false, error: 'not_found' });
 // candidates supplied by caller, else derive lightweight candidates from other txns
 const candidates = b.candidates || service.list().filter((t) => t.id !== txn.id && t.direction ===
txn.direction).map((t) => ({ id: t.id, type: 'cash_transaction', amount: t.amount, referenceMasked: t.referenceMasked,
date: t.transactionDate, direction: t.direction }));
 res.json(paymentMatcher.match(txn, candidates));
}));

router.post('/reconcile-preview', wrap(function (req, res) {
 const b = req.body || {};
 res.json(reconciliationService.reconcile(service.list(), b.statementLines || []));
}));

router.post('/duplicate-check-preview', wrap(function (req, res) { res.json(duplicateDetector.check(service.list()));
}));


router.get('/balance-preview', wrap(function (req, res) { res.json(balancePreview.compute(service.list(),
req.query.openingBalance)); }));


router.get('/reconciliation-summary', wrap(function (req, res) {
 const list = service.list();
 const byStatus = {};
 model.MATCH_STATUSES.forEach((s) => { byStatus[s] = list.filter((t) => t.matchStatus === s).length; });
 const dup = duplicateDetector.check(list);
 res.json({ ok: true, dryRun: true, total: list.length, byStatus, duplicateRisksPreview: dup.duplicateRisksPreview,
balance: balancePreview.compute(list, req.query.openingBalance) });
}));

router.post('/accounting-link-preview', wrap(function (req, res) {
 const b = req.body || {};
 const txn = service.get(b.transactionId);
 if (!txn) return res.status(404).json({ ok: false, error: 'not_found' });
 res.json(accountingLinkPreview.preview(txn));
}));

router.post('/import-preview', wrap(function (req, res) {
 // Accepts a batch of raw-ish lines and returns normalized PREVIEW transactions. Nothing persisted.
 const lines = (req.body && req.body.lines) || [];
 const preview = lines.slice(0, 500).map((l) => model.newTransaction(l));
 // strip raw fields from preview output
 const safe = preview.map((t) => ({ id: t.id, transactionDate: t.transactionDate, source: t.source, direction:
t.direction, amount: t.amount, method: t.method, matchStatus: 'unmatched' }));
 res.json({ ok: true, dryRun: true, liveImport: false, count: safe.length, transactionsPreview: safe, warnings:
lines.length > 500 ? ['truncated_to_500'] : [], blockers: [] });
}));

module.exports = router;
