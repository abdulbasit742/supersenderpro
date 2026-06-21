'use strict';
const b = require('./_base');
const P = 'billingMock';
function getStatus() { return b.status(P, ['No real billing; preview only.']); }
function validateInput(i) { return b.validate(i, ['tenant']); }
function runPreview(i) { i = i || {}; return b.preview(P, i.action || 'upgrade', { tenant: i.tenant || 'DEMO-TENANT-001',
from: i.from || 'starter', to: i.to || 'pro' }, { invoiceRef: 'DEMO-INV-001', status: 'preview_only', wouldCharge: false
}, ['No real charge or billing write.']); }
function getSampleScenarios() { return ['tenant_billing_upgrade']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
