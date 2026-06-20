// lib/customerPortal/invoiceStatusPreview.js — Safe invoice/payment previews. No live payment, no invoice mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef } = require('./redactor');

function isOverdue(inv) {
  return inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate).getTime() < Date.now();
}

function listInvoices(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const invoices = (customer.invoices || []).map((i) => ({
    invoiceIdPreview: maskRef(i.id, 'inv'),
    amountPreview: Number(i.amount || 0),
    balancePreview: Number(i.balance || 0),
    statusPreview: `${i.status}_preview`,
    overdue: isOverdue(i),
  }));
  return safeResponse({ livePayment: false, liveInvoiceMutation: false, invoicesPreview: invoices });
}

function getInvoiceStatusPreview(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const inv = (customer.invoices || []).find((i) => i.status !== 'paid') || (customer.invoices || [])[0] || {};
  const warnings = [];
  if (inv.status && inv.status !== 'paid') warnings.push('unpaid_invoice');
  if (isOverdue(inv)) warnings.push('overdue_invoice');
  warnings.push('payment_action_disabled');
  return safeResponse({
    livePayment: false,
    liveInvoiceMutation: false,
    invoiceIdPreview: maskRef(inv.id || 'inv', 'inv'),
    amountPreview: Number(inv.amount || 0),
    paidPreview: Number(inv.paid || 0),
    balancePreview: Number(inv.balance != null ? inv.balance : (inv.amount || 0) - (inv.paid || 0)),
    statusPreview: `${inv.status || 'unknown'}_preview`,
    paymentLinkPreview: false,
    warnings,
  });
}

module.exports = { listInvoices, getInvoiceStatusPreview, isOverdue };
