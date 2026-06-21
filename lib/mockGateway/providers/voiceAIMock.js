'use strict';
const b = require('./_base');
const P = 'voiceAIMock';
function getStatus() { return b.status(P, ['No voice provider call; canned transcript.']); }
function validateInput(i) { return b.validate(i, ['audioRef']); }
function runPreview(i) { i = i || {}; return b.preview(P, 'transcribe', { audioRef: i.audioRef || 'DEMO-AUDIO-001',
seconds: i.seconds || 10 }, { transcript: 'Salam, mujhe order ki update chahiye.', confidence: 0.92, wouldCallProvider:
false }, ['No external voice provider called.']); }
function getSampleScenarios() { return ['voice_transcript']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
