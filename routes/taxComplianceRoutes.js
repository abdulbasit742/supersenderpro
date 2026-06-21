  'use strict';
  /**
   * routes/taxComplianceRoutes.js — Tax / GST / VAT + Financial Compliance Reports API.
   * Preview-only / dry-run. No real tax filing, no government/FBR/IRS/HMRC API, no
   * external calls, no invoice/payment mutation, no secrets, no full PII. express.json() for POST.
   */
  const express = require('express');
  const router = express.Router();

  const store = require('../lib/taxCompliance/store');
  const model = require('../lib/taxCompliance/taxRuleModel');
  const taxCalculator = require('../lib/taxCompliance/taxCalculator');
  const invoiceTaxPreview = require('../lib/taxCompliance/invoiceTaxPreview');
  const expenseTaxPreview = require('../lib/taxCompliance/expenseTaxPreview');
  const taxReportService = require('../lib/taxCompliance/taxReportService');
  const taxRiskChecker = require('../lib/taxCompliance/taxRiskChecker');
  const complianceChecklist = require('../lib/taxCompliance/complianceChecklist');
  const auditExportPreview = require('../lib/taxCompliance/auditExportPreview');

  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  function ensureSeeded() { if (store.allRules().length === 0) store.bulkPutRules(model.seeds()); }
  function rules() { ensureSeeded(); return store.allRules(); }

  router.get('/status', wrap(function (req, res) {
    ensureSeeded();
    res.json({ ok: true, module: 'tax-compliance', dryRun: true, liveActionsEnabled: false, noTaxFiling: true,
  noGovernmentApi: true, externalCalls: false, taxRules: store.allRules().length, warnings: [], blockers: [], timestamp:
  new Date().toISOString() });
  }));


  router.get('/rules', wrap(function (req, res) { res.json({ ok: true, dryRun: true, rules: rules() }); }));
  router.post('/rules', wrap(function (req, res) { const r = model.newRule(req.body || {}); store.putRule(r); res.json({
  ok: true, dryRun: true, rule: r }); }));
  router.get('/rules/:id', wrap(function (req, res) { ensureSeeded(); const r = store.getRule(req.params.id); return r ?
  res.json({ ok: true, dryRun: true, rule: r }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
  router.put('/rules/:id', wrap(function (req, res) { ensureSeeded(); const cur = store.getRule(req.params.id); if (!cur)
  return res.status(404).json({ ok: false, error: 'not_found' }); const merged = model.newRule(Object.assign({}, cur,
  req.body || {}, { id: cur.id, createdAt: cur.createdAt })); store.putRule(merged); res.json({ ok: true, dryRun: true,
  rule: merged }); }));

  router.post('/calculate-preview', wrap(function (req, res) { res.json(taxCalculator.calculate(req.body || {})); }));

router.post('/invoice-tax-preview', wrap(function (req, res) { const b = req.body || {}; const figures = b.invoices ?
b.invoices : model.sampleFigures().invoices; res.json(invoiceTaxPreview.preview(figures, rules())); }));
router.post('/expense-tax-preview', wrap(function (req, res) { const b = req.body || {}; const figures = b.expenses ?
b.expenses : model.sampleFigures().expenses; res.json(expenseTaxPreview.preview(figures, rules())); }));

router.get('/reports', wrap(function (req, res) { res.json({ ok: true, dryRun: true, monthly:
taxReportService.build('monthly_preview', null, rules()), quarterly: taxReportService.build('quarterly_preview', null,
rules()) }); }));
router.get('/reports/monthly', wrap(function (req, res) { res.json(taxReportService.build('monthly_preview', null,
rules())); }));
router.get('/reports/quarterly', wrap(function (req, res) { res.json(taxReportService.build('quarterly_preview', null,
rules())); }));

router.get('/risk-check', wrap(function (req, res) { const report = taxReportService.build('monthly_preview', null,
rules()); res.json(Object.assign({ ok: true, dryRun: true }, taxRiskChecker.check(report, rules()))); }));

router.get('/checklist', wrap(function (req, res) { const report = taxReportService.build('monthly_preview', null,
rules()); res.json(complianceChecklist.run(rules(), report)); }));


router.post('/audit-export-preview', wrap(function (req, res) { const b = req.body || {};
res.json(auditExportPreview.build(b.period || 'monthly_preview', b.figures || model.sampleFigures())); }));


router.get('/summary', wrap(function (req, res) {
 const m = taxReportService.build('monthly_preview', null, rules());
 const checklist = complianceChecklist.run(rules(), m);
 res.json({ ok: true, dryRun: true, liveActionsEnabled: false, taxRules: store.allRules().length,
monthlyNetTaxPayablePreview: m.netTaxPayablePreview, totalTaxCollectedPreview: m.totalTaxCollectedPreview,
totalTaxPaidPreview: m.totalTaxPaidPreview, riskLevel: m.riskLevel, checklistReady: checklist.ready, warnings:
m.warnings, blockers: [] });
}));

module.exports = router;
