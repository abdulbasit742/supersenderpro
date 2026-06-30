// lib/returns/index.js
// Public surface for the Returns & Refunds (RMA) department.

'use strict';

const config = require('./config');
const engine = require('./returnEngine');
const returnStore = require('./returnStore');
const refundCalc = require('./refundCalc');
const privacy = require('./privacy');
const doctor = require('./doctor');

module.exports = {
  config,
  // lifecycle
  createReturn: engine.createReturn,
  approve: engine.approve,
  reject: engine.reject,
  receive: engine.receive,
  refund: engine.refund,
  // reads
  list: returnStore.list,
  get: returnStore.get,
  STATUSES: returnStore.STATUSES,
  // helpers
  computeRefund: refundCalc.computeRefund,
  maskCustomer: privacy.maskCustomer,
  // ops
  doctor: doctor.check
};
