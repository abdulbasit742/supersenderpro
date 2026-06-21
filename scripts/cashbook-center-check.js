  'use strict';
  /**
   * scripts/cashbook-center-check.js — loads the cashbook layer, confirms safe
   * defaults, exercises balance/match/duplicate/reconcile on seed data, writes a
   * report to artifacts/. Read-only on source; only writes under artifacts/.
   * No network, no bank call, no payment, no secrets printed.
   */
  const fs = require('fs');
  const path = require('path');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));

  function main() {
    const model = R('lib/cashbookCenter/cashTransactionModel.js');
    const balancePreview = R('lib/cashbookCenter/balancePreview.js');
    const paymentMatcher = R('lib/cashbookCenter/paymentMatcher.js');
    const duplicateDetector = R('lib/cashbookCenter/duplicateDetector.js');
    const reconciliationService = R('lib/cashbookCenter/reconciliationService.js');
    const accountingLinkPreview = R('lib/cashbookCenter/accountingLinkPreview.js');
    R('routes/cashbookCenterRoutes.js');

    const seeds = model.seeds();
    const blockers = [];
    const warnings = [];

    const bal = balancePreview.compute(seeds, 0);
    if (typeof bal.closingBalancePreview !== 'number') blockers.push('bad_balance');


    // seeds include a JazzCash + bank_transfer pair with same amount+ref -> duplicate risk expected
    const dup = duplicateDetector.check(seeds);
    if (dup.duplicateRisksPreview < 1) blockers.push('duplicate_not_detected');

    // matcher must surface the duplicate as a confident match candidate
    const jc = seeds.find((t) => t.id === 'ctx_seed1');
    const candidates = seeds.filter((t) => t.id !== jc.id && t.direction === jc.direction).map((t) => ({ id: t.id, amount:
  t.amount, referenceMasked: t.referenceMasked, date: t.transactionDate, direction: t.direction }));
    const m = paymentMatcher.match(jc, candidates);
    if (m.matchConfidencePreview <= 0) warnings.push('no_match_found_for_seed');

    const recon = reconciliationService.reconcile(seeds, []);

    if (recon.liveReconcile !== false) blockers.push('reconcile_not_dry_run');

    const link = accountingLinkPreview.preview(jc);
    if (link.liveLedgerWrite !== false) blockers.push('ledger_write_not_blocked');

    const result = {
      generatedAt: new Date().toISOString(),
      dryRun: true, liveActionsEnabled: false, noBankCall: true, noPaymentAction: true, noRefund: true,
      module: 'cashbook-center',
      seedTransactions: seeds.length,
      closingBalancePreview: bal.closingBalancePreview,
      duplicateRisksPreview: dup.duplicateRisksPreview,
      warnings, blockers,
      pass: blockers.length === 0,
    };


    const ARTIFACTS = path.join(ROOT, 'artifacts');
    if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACTS, 'cashbook_center_check.json'), JSON.stringify(result, null, 2));


    console.log('[cashbook-center:check] txns=%d dupes=%d closing=%d blockers=%d pass=%s', result.seedTransactions,
  result.duplicateRisksPreview, result.closingBalancePreview, result.blockers.length, result.pass);
    process.exit(result.pass ? 0 : 1);
  }
  main();
