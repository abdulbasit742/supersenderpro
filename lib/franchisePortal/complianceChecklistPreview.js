// lib/franchisePortal/complianceChecklistPreview.js — Safe compliance/audit checklist preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, safeText } = require('./redactor');

function getComplianceChecklistPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const warnings = [];
  const items = (franchise.compliance || []).map((c) => {
    if ((c.status || '') === 'pending') warnings.push('compliance_pending_preview');
    if ((c.status || '') === 'failed') warnings.push('compliance_failed_preview');
    return {
      checklistIdPreview: maskRef(c.id, 'chk'),
      nameSafe: safeText(c.name || 'checklist'),
      statusPreview: `${c.status || 'pending'}_preview`,
    };
  });
  return safeResponse({ liveComplianceMutation: false, complianceChecklistPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { getComplianceChecklistPreview };
