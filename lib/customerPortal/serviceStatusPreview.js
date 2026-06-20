// lib/customerPortal/serviceStatusPreview.js — Safe service work-order / job-card previews. No job/inventory mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef, maskName } = require('./redactor');

function listServiceJobs(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const jobs = (customer.serviceJobs || []).map((j) => ({
    workOrderIdPreview: maskRef(j.id, 'wo'),
    statusPreview: `${j.status}_preview`,
    technicianSafe: maskName(j.technician),
    delayed: !!j.delayed,
  }));
  return safeResponse({ liveJobMutation: false, liveInventoryMutation: false, serviceJobsPreview: jobs });
}

function getServiceStatusPreview(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const j = (customer.serviceJobs || [])[0] || {};
  const warnings = [];
  if (j.delayed) warnings.push('delayed_service_job');
  return safeResponse({
    liveJobMutation: false,
    liveInventoryMutation: false,
    workOrderIdPreview: maskRef(j.id || 'wo', 'wo'),
    statusPreview: `${j.status || 'unknown'}_preview`,
    technicianSafe: maskName(j.technician),
    serviceSummaryPreview: { summary: j.summary || '' },
    warnings,
  });
}

module.exports = { listServiceJobs, getServiceStatusPreview };
