// lib/voiceAI/providers/index.js — Resolves a provider id to its TTS/STT implementation.
// Always falls back to the safe mock provider for unknown ids.

const mock = require('./mockProvider');
const localTts = require('./localTtsProvider');
const elevenlabs = require('./elevenlabsProvider');
const openaiAudio = require('./openaiAudioProvider');
const genericStt = require('./genericSttProvider');

function getTTS(providerId) {
 switch (providerId) {
 case 'local_tts': return (a) => localTts.synthesize(a);
 case 'elevenlabs': return (a) => elevenlabs.synthesize(a);
 case 'openai_audio': return (a) => openaiAudio.synthesize(a);
 case 'mock_dry_run':
 default: return (a) => mock.synthesize(a);
 }
}

function getSTT(providerId) {
 switch (providerId) {
 case 'openai_audio': return (a) => openaiAudio.transcribe(a);
 case 'mock_dry_run': return (a) => mock.transcribe(a);
 case 'google_speech':
 case 'azure_speech':
 case 'aws_polly':
 case 'deepgram':
 case 'whisper_local': return (a) => genericStt.transcribe(a, providerId);
 default: return (a) => mock.transcribe(a);
 }
}

module.exports = { getTTS, getSTT, mock, localTts, elevenlabs, openaiAudio, genericStt };
