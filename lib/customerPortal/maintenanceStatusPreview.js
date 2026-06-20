// lib/customerPortal/maintenanceStatusPreview.js — Safe maintenance / AMC / service-plan previews.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef } = require('./redactor');

function expiringSoon(dateStr, days = 30) {
  return dateStr && new Date(dateStr).getTime() - Date.now() < days * 86400000;
}

function listMaintenancePlans(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const warnings = [];
  const plans = (customer.maintenancePlans || []).map((p) => {
    if (expiringSoon(p.expiry)) warnings.push('service_plan_expiring');
    return {
      planIdPreview: maskRef(p.id, 'amc'),
      planSafe: p.plan || '',
      statusPreview: `${p.status}_preview`,
      expiryPreview: p.expiry || '',
      expiringSoon: expiringSoon(p.expiry),
    };
  });
  return safeResponse({ liveJobMutation: false, maintenancePlansPreview: plans, warnings });
}

function getMaintenanceStatusPreview(input = {}) {
  const list = listMaintenancePlans(input);
  const first = (list.maintenancePlansPreview || [])[0] || {};
  return safeResponse({ liveJobMutation: false, planPreview: first, warnings: list.warnings });
}

module.exports = { listMaintenancePlans, getMaintenanceStatusPreview, expiringSoon };
