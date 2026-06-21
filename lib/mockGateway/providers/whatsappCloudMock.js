  'use strict';
  const b = require('./_base');
  const P = 'whatsappCloudMock';
  function getStatus() { return b.status(P, ['Cloud API simulated; no Meta call.']); }
  function validateInput(i) { return b.validate(i, ['to']); }
  function runPreview(i) { i = i || {}; return b.preview(P, i.action || 'send_template', { to: i.to, template: i.template

|| 'order_confirmation' }, { messaging_product: 'whatsapp', messages: [{ id: 'DEMO-WAMID-001' }], wouldCallMeta: false },
['No Meta Cloud API call made.']); }
function getSampleScenarios() { return ['wa_order_confirmation']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
