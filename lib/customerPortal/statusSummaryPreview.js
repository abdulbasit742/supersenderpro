 'use strict';
 /**
  * statusSummaryPreview.js — builds the self-service status summary for one
  * customer (by preview token). Returns the minimum-safe response shape. All data
  * masked; no underlying records exposed. Read-only / dry-run.
  */
 const service = require('./customerPortalService');
 const model = require('./customerPortalModel');
 const redactor = require('./redactor');

 // Which statuses count as "needs attention" for a friendly warning.
 const ATTENTION = { invoice: ['unpaid', 'overdue'], ticket: ['open'], complaint: ['under_review', 'open'], contract:

['expiring_soon', 'expired'], warranty_repair: ['in_repair'], document_request: ['pending'] };

function baseShape(extra) {
    return Object.assign({
      ok: true,
     dryRun: true,
     liveActionsEnabled: false,
     portalPublicLive: false,
     piiMasked: true,
     externalCallsEnabled: false,
     summaryPreview: {},
     warnings: [],
     blockers: [],
    }, extra || {});
}


function forToken(previewToken) {
    const c = service.getByToken(previewToken);
    if (!c) return baseShape({ ok: false, blockers: ['customer_not_found'] });
    const warnings = [];
    model.STATUS_AREAS.forEach((area) => {
     const v = c.statuses[area];
     if (ATTENTION[area] && ATTENTION[area].includes(v)) warnings.push(area + '_needs_attention');
    });
    return baseShape({
     summaryPreview: {
       customer: { displayNameSafe: c.displayNameSafe, phoneMasked: c.phoneMasked, emailMasked: c.emailMasked },
       statuses: c.statuses,
       loyaltyPointsPreview: redactor.maskMoney(c.loyaltyPointsPreview),
       attentionAreas: warnings.map((w) => w.replace('_needs_attention', '')),
     },
      warnings,
    });
}

// Portal-wide status (no specific customer): safe capability report.
function overview() {
    const list = service.list();
    return baseShape({ summaryPreview: { module: 'customer-portal', customersPreview: list.length, statusAreas:
model.STATUS_AREAS, note: 'Foundation ready. Routes + dashboard arrive in Part 2/3.' } });
}

module.exports = { forToken, overview, baseShape, ATTENTION };
