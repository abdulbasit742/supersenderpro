// lib/serviceCenter/customerApprovalPreview.js
// Builds an approval request preview for customer sign-off on estimate.
// Reuses Approval Center read-only when present; never sends.
'use strict';

const store = require('./store');
const profitability = require('./serviceProfitability');
const { maskName, maskPhone } = require('./redactor');

function tryRequire(paths) {
  for (const p of paths) { try { return require(p); } catch (e) { /* degrade */ } }
    return null;
}
const approvalCenter = tryRequire(['../approvalCenter/approvalService', '../approvalCenter']);

const FLAGS = { liveSend: false };


function build(woId) {
  const wo = store.getWorkOrder(woId);
    if (!wo) return { ok: false, errors: ['work order not found'] };
    const prof = profitability.forWorkOrder(wo.id);
    const estimate = prof.ok ? prof.quotedPrice : null;
    const request = {
      type: 'service_estimate_approval',
      workOrderRef: wo.ref,
      customer: maskName(wo.customerName),
      contact: maskPhone(wo.phone),
      asset: wo.asset,
      estimatedTotal: estimate,
      requiresApproval: estimate != null && estimate > 5000,
      channelPreview: 'whatsapp'
    };
    return {
      ok: true,
      approvalCenterConnected: !!approvalCenter,
      request,
      liveSend: FLAGS.liveSend,
      note: 'Preview only. No approval request sent. liveSend disabled.'
    };
}


module.exports = { FLAGS, build };
