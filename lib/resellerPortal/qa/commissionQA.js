 'use strict';

 /**
  * Reseller Portal QA — commission preview QA. Reads the existing commissionPreview
     * read-only and asserts it is preview-only, masked, and requires manual review.
     */

 const guard = require('./qaGuard');
 const payoutSafety = require('./payoutSafetyCheck');

function run(resellerId) {
    const commission = guard.loadPortal('commissionPreview');
    const payout = payoutSafety.run();


    if (!commission || typeof commission.preview !== 'function') {
   return { previewOnly: true, payoutDisabled: payout.payoutDisabled, manualReviewRequired: true, status: 'unavailable',
warnings: ['commission module not available; SaaS Billing adapter unavailable handled safely'], blockers: payout.blockers
};
    }

    let preview;
    try { preview = commission.preview(resellerId || 'qa_sample'); }
    catch (e) { return { previewOnly: true, payoutDisabled: payout.payoutDisabled, manualReviewRequired: true, status:
'error', warnings: ['commission preview failed safely'], blockers: payout.blockers }; }


    const blockers = payout.blockers.slice();
    const warnings = payout.warnings.slice();

    const status = preview && (preview.payoutStatus || (preview.commission && preview.commission.payoutStatus));
 if (status && status !== 'preview_only') blockers.push('Commission payoutStatus is "' + status + '"; expected "preview_only".');
    if (preview && preview.dryRun === false) blockers.push('Commission preview not in dry-run.');


    const leaks = guard.findLeaks(preview);
    if (leaks.length) blockers.push('Commission preview exposes ' + leaks.join(', ') + ' (invoice/payment refs must be masked).');


    return {
      previewOnly: true,
        payoutDisabled: payout.payoutDisabled,
        manualReviewRequired: true,
        status: blockers.length ? 'blocked' : (warnings.length ? 'warning' : 'verified'),
        warnings: warnings,
        blockers: blockers,
    };
}


module.exports = { run };
