'use strict';
const b = require('./_base');
const P = 'tenantMock';
function getStatus() { return b.status(P, ['No tenant writes; preview only.']); }
function validateInput(i) { return b.validate(i, ['tenant']); }
function runPreview(i) { i = i || {}; return b.preview(P, i.action || 'provision', { tenant: i.tenant || 'DEMO-TENANT-001' }, { tenantId: 'DEMO-TENANT-001', status: 'preview', wouldCreateTenant: false }, ['No real tenant created.']); }
function getSampleScenarios() { return []; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
