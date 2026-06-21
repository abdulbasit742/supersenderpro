 'use strict';
 /**
  * statusSummaryPreview.js — vendor self-service status summary for one supplier
     * (by preview token). Returns the minimum-safe shape. All data masked; no
     * underlying records exposed. Read-only / dry-run.
  */
 const service = require('./supplierPortalService');
 const model = require('./supplierPortalModel');


 const ATTENTION = { bill_payment: ['overdue', 'pending'], quote: ['draft'], contract: ['expiring_soon', 'expired'],
 delivery: ['delayed'], quality_score: ['watch', 'poor'], document_request: ['pending'] };


 function baseShape(extra) {
   return Object.assign({ ok: true, dryRun: true, liveActionsEnabled: false, supplierPortalPublicLive: false, piiMasked:
 true, externalCallsEnabled: false, summaryPreview: {}, warnings: [], blockers: [] }, extra || {});
 }


 function forToken(previewToken) {

  const s = service.getByToken(previewToken);
  if (!s) return baseShape({ ok: false, blockers: ['supplier_not_found'] });
  const warnings = [];
model.STATUS_AREAS.forEach((area) => { const v = s.statuses[area]; if (ATTENTION[area] && ATTENTION[area].includes(v))
warnings.push(area + '_needs_attention'); });
  return baseShape({
    summaryPreview: {
    supplier: { displayNameSafe: s.displayNameSafe, phoneMasked: s.phoneMasked, emailMasked: s.emailMasked, bankMasked:
s.bankMasked, taxMasked: s.taxMasked },
     statuses: s.statuses,
     qualityScorePreview: Number(s.qualityScorePreview) || 0,
     attentionAreas: warnings.map((w) => w.replace('_needs_attention', '')),
   },
    warnings,
  });
}


function overview() {
const list = service.list();
return baseShape({ summaryPreview: { module: 'supplier-portal', suppliersPreview: list.length, statusAreas:
model.STATUS_AREAS } });
}
module.exports = { forToken, overview, baseShape, ATTENTION };
