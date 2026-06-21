'use strict';
const b = require('./_base');
const P = 'supportMock';
function getStatus() { return b.status(P); }
function validateInput(i) { return b.validate(i, ['ticketId']); }
function runPreview(i) { i = i || {}; return b.preview(P, 'reply', { ticketId: i.ticketId || 'DEMO-TKT-001', body: i.body
}, { ticketId: i.ticketId || 'DEMO-TKT-001', status: 'reply_drafted', wouldSend: false }, ['No real support message sent.']); }
function getSampleScenarios() { return ['support_reply']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
