// lib/purchaseOrders/config.js
// Purchase Orders & Suppliers department config.
// Department #67. JSON-backed, tenant-scoped, advisory/draft-safe.

'use strict';

const path = require('path');

const DATA_DIR = process.env.PO_DATA_DIR
  || path.join(process.cwd(), 'data', 'purchase-orders');

module.exports = {
  DATA_DIR,
  SUPPLIERS_FILE: path.join(DATA_DIR, 'suppliers.json'),
  POS_FILE: path.join(DATA_DIR, 'purchase-orders.json'),

  // PO lifecycle states.
  PO_STATES: ['draft', 'ordered', 'partial', 'received', 'cancelled'],
  DEFAULT_STATE: 'draft',

  // Default currency for cost amounts (display only; no FX).
  DEFAULT_CURRENCY: process.env.PO_CURRENCY || 'USD',

  // Reorder suggestion tuning.
  // Suggest reorder qty = max(0, reorderPoint*REORDER_MULT - onHand).
  REORDER_MULT: Number(process.env.PO_REORDER_MULT || 2),

  // Advisory-safe: nothing here ever places a real order or charges anyone.
  DRY_RUN: String(process.env.PO_DRY_RUN || 'true') !== 'false'
};
