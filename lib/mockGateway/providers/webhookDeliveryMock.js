'use strict';
const b = require('./_base');
const P = 'webhookDeliveryMock';
function getStatus() { return b.status(P, ['No real HTTP delivery; offline simulation.']); }
function validateInput(i) { return b.validate(i, ['url', 'event']); }
function runPreview(i) {
  i = i || {};
  const fail = i.simulate === 'fail';
  return b.preview(P, 'deliver', { url: i.url || 'https://example.com/webhook/demo', event: i.event || 'demo.event' }, {
httpStatus: fail ? 500 : 200, delivered: !fail, attempts: fail ? 3 : 1, wouldDeliver: false }, ['No real webhook delivered.']);
}
function getSampleScenarios() { return ['webhook_success', 'webhook_failed']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
