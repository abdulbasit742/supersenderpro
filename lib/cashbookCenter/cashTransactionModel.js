  'use strict';
  /**
   * cashTransactionModel.js — cash transaction shape, enums, factory, synthetic seeds.
   * Pure data + helpers; no I/O. No real data.
   */
  const crypto = require('crypto');


  const SOURCES = ['manual_entry_preview', 'jazzcash_parser_preview', 'easypaisa_parser_preview', 'bank_transfer_preview',
  'invoice_payment_preview', 'bill_payment_preview', 'ecommerce_order_preview', 'reseller_payment_preview',
  'subscription_payment_preview'];
  const DIRECTIONS = ['cash_in', 'cash_out'];
  const METHODS = ['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'card_preview', 'wallet_preview',
  'adjustment_preview'];
  const MATCH_STATUSES = ['unmatched', 'matched_preview', 'partial_match_preview', 'duplicate_risk', 'needs_review',
  'ignored_preview', 'reconciled_preview'];
  const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];


  function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); }

  function newTransaction(input) {
    const now = new Date().toISOString();
    const i = input || {};
    return {
      id: i.id || 'ctx_' + crypto.randomBytes(5).toString('hex'),
      transactionDate: i.transactionDate || now.slice(0, 10),
      source: SOURCES.includes(i.source) ? i.source : 'manual_entry_preview',
      direction: DIRECTIONS.includes(i.direction) ? i.direction : 'cash_in',
      amount: num(i.amount),
      currency: i.currency || 'PKR',
      method: METHODS.includes(i.method) ? i.method : 'cash',
      referenceMasked: i.referenceMasked || (i.reference ? undefined : '****'),
      reference: i.reference,
      payerName: i.payerName, payeeName: i.payeeName,
      payerNameSafe: i.payerNameSafe, payeeNameSafe: i.payeeNameSafe,
      linkedInvoiceIdPreview: i.linkedInvoiceIdPreview || null,
      linkedBillIdPreview: i.linkedBillIdPreview || null,
      linkedLedgerEntryIdPreview: i.linkedLedgerEntryIdPreview || null,

     matchStatus: MATCH_STATUSES.includes(i.matchStatus) ? i.matchStatus : 'unmatched',
     riskLevel: RISK_LEVELS.includes(i.riskLevel) ? i.riskLevel : 'low',
     dryRun: true,
     createdAt: i.createdAt || now,
     updatedAt: now,
   };
}


function seeds() {
   return [
     newTransaction({ id: 'ctx_seed1', source: 'jazzcash_parser_preview', direction: 'cash_in', amount: 5500, method:
'jazzcash', reference: 'JC-TXN-88231', payerName: 'Ayesha', transactionDate: '2026-06-18', linkedInvoiceIdPreview:
'inv_1001' }),
   newTransaction({ id: 'ctx_seed2', source: 'easypaisa_parser_preview', direction: 'cash_in', amount: 4200, method:
'easypaisa', reference: 'EP-TXN-55120', payerName: 'Bilal', transactionDate: '2026-06-18' }),
   newTransaction({ id: 'ctx_seed3', source: 'bank_transfer_preview', direction: 'cash_in', amount: 5500, method:
'bank_transfer', reference: 'JC-TXN-88231', payerName: 'Ayesha', transactionDate: '2026-06-18' }),
   newTransaction({ id: 'ctx_seed4', source: 'bill_payment_preview', direction: 'cash_out', amount: 3000, method:
'bank_transfer', reference: 'BILL-7781', payeeName: 'HardwareCoX', transactionDate: '2026-06-19', linkedBillIdPreview:
'bill_551' }),
   newTransaction({ id: 'ctx_seed5', source: 'manual_entry_preview', direction: 'cash_out', amount: 800, method: 'cash',
reference: 'PETTY-01', payeeName: 'Office', transactionDate: '2026-06-19' }),
   newTransaction({ id: 'ctx_seed6', source: 'subscription_payment_preview', direction: 'cash_in', amount: 1200, method:
'card_preview', reference: 'SUB-3321', payerName: 'Sara', transactionDate: '2026-06-20' }),
 ];
}

module.exports = { SOURCES, DIRECTIONS, METHODS, MATCH_STATUSES, RISK_LEVELS, newTransaction, seeds, num };
