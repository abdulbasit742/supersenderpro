// lib/staffPortal/contractStatusPreview.js — Safe contract/agreement status previews. No mutation, no download.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listContracts(input = {}) {
  return getContractStatusPreview(input);
}

function getContractStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const contracts = (staff.contracts || []).map((c) => {
    if ((c.status || '') === 'expiring') warnings.push('contract_expiring');
    return {
      contractIdPreview: maskRef(c.id || 'con', 'con'),
      nameSafe: safeText(c.name || 'agreement'),
      statusPreview: `${c.status || 'active'}_preview`,
      expiryPreview: c.expiry || '',
    };
  });
  return safeResponse({
    liveContractMutation: false,
    liveDocumentDownload: false,
    contractsPreview: contracts,
    warnings: [...new Set(warnings)],
  });
}

module.exports = { listContracts, getContractStatusPreview };
