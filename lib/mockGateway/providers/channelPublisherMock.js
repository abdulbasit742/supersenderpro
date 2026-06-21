'use strict';
const b = require('./_base');
const P = 'channelPublisherMock';
function getStatus() { return b.status(P); }
function validateInput(i) { return b.validate(i, ['text']); }
function runPreview(i) { i = i || {}; return b.preview(P, 'publish', { channel: i.channel || 'DEMO-CHANNEL', text: i.text
}, { postId: 'DEMO-POST-001', wouldPublish: true }, ['No channel post published.']); }
function getSampleScenarios() { return ['wa_channel_post']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
