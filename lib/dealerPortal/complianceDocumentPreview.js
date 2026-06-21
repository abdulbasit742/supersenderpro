// lib/dealerPortal/complianceDocumentPreview.js — KYC / compliance document status preview. No download, no share.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listComplianceDocuments(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const docs = (dealer.compliance || []).map((d) => {
    if (d.status === 'missing') warnings.push('document_missing');
    if (d.status === 'pending') warnings.push('compliance_required');
    return { documentIdPreview: maskRef(d.id, 'cmp'), nameSafe: safeText(d.name), statusPreview: safeText(d.status || 'unknown') };
  });
  return safeResponse({ liveDocumentDownload: false, liveShare: false, complianceDocumentsPreview: docs, warnings: [...new Set(warnings)] });
}
module.exports = { listComplianceDocuments };
