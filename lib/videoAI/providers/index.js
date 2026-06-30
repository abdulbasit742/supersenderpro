// lib/videoAI/providers/index.js — Resolves a provider id to its video implementation.
// Always falls back to the safe mock provider for unknown ids.

const mock = require('./mockProvider');
const localVideo = require('./localVideoProvider');

function getGenerator(providerId) {
 switch (providerId) {
 case 'local_video': return (a) => localVideo.generate(a);
 case 'mock_dry_run':
 default: return (a) => mock.generate(a);
 }
}

module.exports = { getGenerator, mock, localVideo };
