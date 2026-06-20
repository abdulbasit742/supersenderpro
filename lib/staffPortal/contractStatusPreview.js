// lib/staffPortal/contractStatusPreview.js — Safe contract / agreement status preview.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function expiringSoon(d, days = 30) { return d && new Date(d).getTime() - Date.now() < days * 86400000; }

function listContracts(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const contracts = (staff.contracts || []).map((c) => {
    if (expiringSoon(c.expiry)) warnings.push('contract_expiring');
    return {
      contractIdPreview: maskRef(c.id, 'con'),
      nameSafe: safeText(c.name),
      statusPreview: `${c.status}_preview`,
      expiryPreview: c.expiry || '',
    };
  });
  return safeResponse({ liveContractMutation: false, contractsPreview: contracts, warnings });
}
function getContractStatusPreview(input = {}) {
  const list = listContracts(input);
  return safeResponse({ liveContractMutation: false, contractPreview: (list.contractsPreview || [])[0] || {}, warnings: list.warnings });
}
module.exports = { listContracts, getContractStatusPreview };
