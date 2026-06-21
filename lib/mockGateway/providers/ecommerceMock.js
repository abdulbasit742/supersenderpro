'use strict';
const b = require('./_base');
const P = 'ecommerceMock';
function getStatus() { return b.status(P); }
function validateInput(i) { return b.validate(i, ['orderId']); }
function runPreview(i) { i = i || {}; return b.preview(P, i.action || 'create_order', { orderId: i.orderId || 'DEMO-ORDER-001', items: i.items || 1 }, { orderId: i.orderId || 'DEMO-ORDER-001', status: 'received', wouldWrite: false },
['No real order written.']); }
function getSampleScenarios() { return ['ecom_order_received']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
