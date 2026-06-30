// lib/purchaseOrders/index.js
// Public surface for the Purchase Orders & Suppliers department (#67).

'use strict';

const config = require('./config');
const supplierStore = require('./supplierStore');
const poEngine = require('./poEngine');
const privacy = require('./privacy');
const doctor = require('./doctor');

module.exports = {
  config,
  // suppliers
  listSuppliers: supplierStore.listSuppliers,
  getSupplier: supplierStore.getSupplier,
  createSupplier: supplierStore.createSupplier,
  updateSupplier: supplierStore.updateSupplier,
  // purchase orders
  listPOs: poEngine.listPOs,
  getPO: poEngine.getPO,
  createPO: poEngine.createPO,
  setState: poEngine.setState,
  receive: poEngine.receive,
  cancelPO: poEngine.cancelPO,
  reorderSuggestions: poEngine.reorderSuggestions,
  // utils
  maskSupplier: privacy.maskSupplier,
  check: doctor.check
};
