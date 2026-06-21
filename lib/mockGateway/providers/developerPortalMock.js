'use strict';
const b = require('./_base');

const P = 'developerPortalMock';
function getStatus() { return b.status(P); }
function validateInput(i) { return b.validate(i, []); }
function runPreview(i) {
  i = i || {};
  if (i.action === 'flag_check') return b.preview(P, 'flag_check', { flag: i.flag || 'live_payments' }, { flag: i.flag ||
'live_payments', enabled: i.enabled === true, blocked: i.enabled !== true }, ['Feature flag evaluated offline.']);
  return b.preview(P, 'event', { event: i.event || 'message.sent', apiKeyRef: i.apiKeyRef || 'DEMO-KEY-001' }, { eventId:
'DEMO-EVT-001', accepted: true, wouldEmitExternally: false }, ['No external developer event emitted.']);
}
function getSampleScenarios() { return ['dev_api_event', 'feature_flag_blocked']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
