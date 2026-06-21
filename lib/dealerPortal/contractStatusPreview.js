// lib/dealerPortal/contractStatusPreview.js — Safe contract/agreement status preview. No mutation, no download.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listContracts(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const items = (dealer.contracts || []).map((c) => {
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
