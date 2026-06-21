// lib/workflowOrchestrator/ecommerceAutomationPreview.js — order/cart draft preview. No live order/inventory/payment.
 'use strict';
 const cfg = require('./config');
 const { maskOrderRef } = require('./redactor');
 function ecommerceAutomationPreview(input) {
   const i = input || {};
     return cfg.base({
       liveOrderCreation: false, liveInventoryMutation: false, livePaymentAction: false,
       cartPreview: { itemsCountPreview: Array.isArray(i.items) ? i.items.length : 0, totalPreview: Number(i.total) || 0 },
       orderDraftPreview: { orderRefMasked: maskOrderRef(i.orderRef || ''), statusPreview: 'draft_preview' },
     });
 }
 module.exports = { ecommerceAutomationPreview };
