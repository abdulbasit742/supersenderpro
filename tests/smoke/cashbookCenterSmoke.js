  'use strict';
  /**
   * tests/smoke/cashbookCenterSmoke.js — module-level smoke. No server, no network,
   * no bank call. Verifies model, balance, matching, duplicates, reconcile, masking.
   */
  const path = require('path');
  const assert = require('assert');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));


  function main() {
    const results = [];
    const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
  status: 'fail', error: e.message }); } };

    const model = R('lib/cashbookCenter/cashTransactionModel.js');
    const store = R('lib/cashbookCenter/store.js');
    const balancePreview = R('lib/cashbookCenter/balancePreview.js');
    const paymentMatcher = R('lib/cashbookCenter/paymentMatcher.js');
    const duplicateDetector = R('lib/cashbookCenter/duplicateDetector.js');
    const reconciliationService = R('lib/cashbookCenter/reconciliationService.js');
    const accountingLinkPreview = R('lib/cashbookCenter/accountingLinkPreview.js');
    const redactor = R('lib/cashbookCenter/redactor.js');
    R('routes/cashbookCenterRoutes.js');

    ok('model forces dryRun true', () => assert.strictEqual(model.newTransaction({ dryRun: false }).dryRun, true));

    ok('store masks reference + names', () => { const t = store.put(model.newTransaction({ id: 'ctx_t1', reference: 'JC-TXN-12345', payerName: 'Ayesha', payeeName: 'Office' })); assert.ok(/\*/.test(t.referenceMasked));
  assert.ok(!/12345/.test(t.referenceMasked)); assert.ok(/\*/.test(t.payerNameSafe)); });
    ok('balance computes closing = open + in - out', () => { const b = balancePreview.compute([model.newTransaction({
  direction: 'cash_in', amount: 100 }), model.newTransaction({ direction: 'cash_out', amount: 40 })], 10);
  assert.strictEqual(b.closingBalancePreview, 70); });
    ok('matcher gives high confidence on same amount + ref tail', () => { const txn = model.newTransaction({ amount: 5500,
  referenceMasked: 'JC****31', direction: 'cash_in', transactionDate: '2026-06-18' }); const m = paymentMatcher.match(txn,
  [{ id: 'x', amount: 5500, referenceMasked: 'JC****31', date: '2026-06-18', direction: 'cash_in' }]);
  assert.ok(m.matchConfidencePreview >= 0.8); });
    ok('duplicate detector flags same amount + ref tail', () => { const a = model.newTransaction({ id: 'a', amount: 5500,
  referenceMasked: 'JC****31', direction: 'cash_in', transactionDate: '2026-06-18' }); const b = model.newTransaction({ id:
  'b', amount: 5500, referenceMasked: 'JC****31', direction: 'cash_in', transactionDate: '2026-06-18' });
  assert.ok(duplicateDetector.check([a, b]).duplicateRisksPreview >= 1); });
    ok('reconcile is dry-run, no live reconcile', () => { const r = reconciliationService.reconcile(model.seeds(), []);
  assert.strictEqual(r.dryRun, true); assert.strictEqual(r.liveReconcile, false); });
    ok('ledger link is balanced + no live write', () => { const l = accountingLinkPreview.preview(model.newTransaction({
  direction: 'cash_in', amount: 100 })); assert.strictEqual(l.liveLedgerWrite, false); const deb =
  l.ledgerEntriesPreview.reduce((a, e) => a + e.debit, 0); const cred = l.ledgerEntriesPreview.reduce((a, e) => a +
  e.credit, 0); assert.strictEqual(deb, cred); });
    ok('no raw reference leaks via redactor', () => { assert.ok(!/12345/.test(redactor.maskRef('JC-TXN-12345'))); });


    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    console.log('[cashbook-center:smoke] passed=%d failed=%d', passed, failed);
    results.filter((r) => r.status === 'fail').forEach((r) => console.log('   FAIL', r.name, '-', r.error));
    process.exit(failed === 0 ? 0 : 1);
  }
  main();
