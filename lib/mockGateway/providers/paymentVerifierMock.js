'use strict';
const b = require('./_base');
const P = 'paymentVerifierMock';
function getStatus() { return b.status(P, ['Validation-only simulation; no real payment verified.']); }
function validateInput(i) { return b.validate(i, ['ref']); }
function runPreview(i) {
  i = i || {};
  const approved = i.amount != null && i.expected != null ? String(i.amount) === String(i.expected) : true;

  return b.preview(P, 'verify', { ref: i.ref || 'DEMO-PAY-001', amount: i.amount, expected: i.expected }, { decision:
approved ? 'approved' : 'rejected', reason: approved ? 'amount matches' : 'amount mismatch', wouldApprovePayment: false
}, ['Preview only. No payment approved or order changed.']);
}
function getSampleScenarios() { return ['pay_approved', 'pay_rejected']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
