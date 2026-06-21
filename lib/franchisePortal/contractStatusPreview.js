// lib/franchisePortal/contractStatusPreview.js — Safe contract/agreement status preview. No mutation, no download.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, safeText } = require('./redactor');

function listContracts(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const warnings = [];
  const items = (franchise.contracts || []).map((c) => {
    if ((c.status || '') === 'expiring') warnings.push('contract_expiring_preview');
    return {
      contractIdPreview: maskRef(c.id, 'con'),
      nameSafe: safeText(c.name || 'agreement'),
      statusPreview: `${safeText(c.status || 'active')}_preview`,
      expiryPreview: c.expiry || '',
    };
  });
  return safeResponse({ liveContractMutation: false, liveDocumentDownload: false, contractsPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { listContracts };
