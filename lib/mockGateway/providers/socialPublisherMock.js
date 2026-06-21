'use strict';
const b = require('./_base');
const P = 'socialPublisherMock';
function getStatus() { return b.status(P); }
function validateInput(i) { return b.validate(i, ['caption']); }
function runPreview(i) { i = i || {}; return b.preview(P, 'publish', { platform: i.platform || 'instagram', caption:
i.caption }, { postId: 'DEMO-SOCIAL-001', wouldPublish: true }, ['No social post published.']); }
function getSampleScenarios() { return ['social_post']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
