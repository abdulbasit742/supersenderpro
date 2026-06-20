// lib/customerPortal/contractStatusPreview.js — Safe contract / service-plan expiry previews.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef, safeText } = require('./redactor');

function expiringSoon(dateStr, days = 30) {
  return dateStr && new Date(dateStr).getTime() - Date.now() < days * 86400000;
}

function listContracts(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const warnings = [];
  const contracts = (customer.contracts || []).map((c) => {
    if (c.status === 'expiring' || expiringSoon(c.expiry)) warnings.push('contract_expiring');
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
  const first = (list.contractsPreview || [])[0] || {};
  return safeResponse({ contractPreview: first, warnings: list.warnings });
}

module.exports = { listContracts, getContractStatusPreview };
