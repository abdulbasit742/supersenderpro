// lib/vendorPortal/complianceDocumentPreview.js — Safe compliance document status preview. No download, no mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef, safeText } = require('./redactor');

function listComplianceDocuments(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const warnings = [];
  const items = (vendor.complianceDocs || []).map((c) => {
    if ((c.status || '') === 'expiring') warnings.push('compliance_doc_expiring_preview');
    if ((c.status || '') === 'expired') warnings.push('compliance_doc_expired_preview');
    return {
      complianceIdPreview: maskRef(c.id, 'cmp'),
      nameSafe: safeText(c.name || 'document'),
      statusPreview: `${c.status || 'unknown'}_preview`,
      expiryPreview: c.expiry || '',
    };
  });
  return safeResponse({ liveDocumentDownload: false, liveComplianceMutation: false, complianceDocumentsPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { listComplianceDocuments };
