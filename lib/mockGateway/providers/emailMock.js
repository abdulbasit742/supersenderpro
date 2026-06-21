'use strict';
const b = require('./_base');
const P = 'emailMock';
function getStatus() { return b.status(P, ['No SMTP/email API; offline preview.']); }
function validateInput(i) { return b.validate(i, ['to']); }
function runPreview(i) { i = i || {}; return b.preview(P, 'send', { to: i.to || 'demo@example.com', subject: i.subject ||
'Demo email' }, { messageId: 'DEMO-EMAIL-001', wouldSend: false }, ['No real email sent.']); }
function getSampleScenarios() { return []; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
