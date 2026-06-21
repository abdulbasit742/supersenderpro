  'use strict';

  /**
   * Loyalty Center — accounting impact preview (no ledger write).
      *
      * Loyalty points + store credit are deferred-revenue / liability entries. This
      * produces a double-entry preview; reuses Accounting Center style read-only.


   */


const liability = require('./rewardLiability');


function accountingModule() { try { return require('../accountingCenter'); } catch (_e) {} try { return
require('../accounting/store'); } catch (_e) {} return null; }
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }


function build() {
    const l = liability.preview();
    const pts = round2(l.totalPointsLiabilityPreview);
    const credit = round2(l.totalStoreCreditLiabilityPreview);
    const ledgerEntriesPreview = [
        { account: 'Marketing / Rewards Expense', debit: pts + credit, credit: 0, memo: 'Loyalty accrual (preview)' },
        { account: 'Loyalty Points Liability', debit: 0, credit: pts, memo: 'Outstanding points (preview)' },
        { account: 'Store Credit Liability', debit: 0, credit: credit, memo: 'Outstanding store credit (preview)' },
    ];
    return {
      ok: true, dryRun: true, liveLedgerWrite: false,
        loyaltyLiabilityPreview: pts,
        storeCreditLiabilityPreview: credit,
        ledgerEntriesPreview,
        accountingModuleDetected: Boolean(accountingModule()),
        warnings: accountingModule() ? [] : ['no accounting center detected; preview is standalone'],
        blockers: [],
    };
}


module.exports = { build };
