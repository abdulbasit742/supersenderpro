// lib/dealerPortal/disputeCenterPreview.js — Dealer dispute center preview. No dispute creation, no mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, maskInvoiceRef, safeText } = require('./redactor');

function listDisputes(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const list = (dealer.disputes || []).map((d) => ({ disputeIdPreview: 'dsp_****', invoiceRefMasked: maskInvoiceRef(d.invoiceRef), reasonSafe: safeText(d.reason), statusPreview: `${d.status || 'open'}_preview` }));
  return safeResponse({ liveDisputeCreation: false, liveInvoiceMutation: false, disputesPreview: list, warnings: [] });
}

function createDisputePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  return safeResponse({
    liveDisputeCreation: false,
    liveInvoiceMutation: false,
    livePaymentAction: false,
    dealerMasked: maskName(dealer.name),
    disputePreview: { invoiceRefMasked: maskInvoiceRef(input.invoiceId), reasonSafe: safeText(input.reason || 'No reason provided'), statusPreview: 'draft_preview' },
    messagePreview: safeText(input.message || 'Dispute draft — nothing is created or submitted.'),
    warnings: ['live_send_disabled'],
  });
}
module.exports = { listDisputes, createDisputePreview };
