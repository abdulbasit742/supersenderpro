'use strict';
const b = require('./_base');
const P = 'aiProviderMock';
function getStatus() { return b.status(P, ['No paid LLM call; canned demo reply.']); }
function validateInput(i) { return b.validate(i, ['prompt']); }
function runPreview(i) { i = i || {}; return b.preview(P, 'complete', { prompt: i.prompt, persona: i.persona || 'sales'
}, { reply: 'Yeh item available hai. Order ke liye SKU + quantity bhejein.', tokens: 42, wouldCallProvider: false }, ['No external AI provider called.']); }
function getSampleScenarios() { return ['ai_reply']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
