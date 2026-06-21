  'use strict';

  const LIVE_CLEANUP = String(process.env.DATA_QUALITY_LIVE_CLEANUP || 'false') === 'true';


  const ACTION_BY_RULE = {
       PROD_MISSING_NAME: 'fill_name',
       PROD_MISSING_PRICE: 'fill_price',
       PROD_DUP_SKU: 'review_merge',
       PROD_DUP_NAME: 'review_merge',
       CUST_MISSING_CONTACT: 'enrich_contact',
       CUST_BAD_EMAIL: 'fix_email',
       CUST_BAD_PHONE: 'fix_phone',
       CUST_DUP_CONTACT: 'review_merge',
       SUPP_MISSING_CONTACT: 'enrich_contact',
       SUPP_DUP: 'review_merge',
       FIN_ORPHAN_INVOICE: 'relink_customer',
       FIN_NEGATIVE_AMOUNT: 'review_amount',
       FIN_DUP_INVOICE: 'review_merge',
       INV_ORPHAN_STOCK: 'relink_or_archive',
       INV_NEGATIVE_QTY: 'correct_quantity',
       INV_PRODUCT_NO_STOCK: 'create_stock_row',
  };

  function buildPlan(issues) {
    const items = (Array.isArray(issues) ? issues : []).map((i, idx) => ({
         step: idx + 1,
         issueId: i.id,
         ruleId: i.ruleId,
         entity: i.entity,
         severity: i.severity,
         proposedAction: ACTION_BY_RULE[i.ruleId] || 'manual_review',
         target: i.ref || {},
         autoApplicable: false, // nothing is auto-applied in this center
       }));

       return {
         generatedAt: new Date().toISOString(),
         mode: 'preview',
         liveCleanupEnabled: LIVE_CLEANUP, // informational; apply path is not implemented
         totalSteps: items.length,
         bySeverity: items.reduce((acc, it) => { acc[it.severity] = (acc[it.severity] || 0) + 1; return acc; }, {}),
         items,
         note: 'PREVIEW ONLY. No records are modified, merged, or deleted by this module.',
       };


}

// Guard: even if someone wires this up, refuse to mutate.
function applyPlan() {
 return { applied: false, reason: 'Live cleanup is disabled by design. This center is preview-only.' };
}


module.exports = { buildPlan, applyPlan, LIVE_CLEANUP };
