'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['src/modules/voice', 'lib/voiceAI']);
  if (!present) return b.unavailable('Voice AI');
  const cloneOn = b.envTrue('VOICE_CLONE_ENABLED');
  const consent = b.envTrue('VOICE_CLONE_CONSENT_CONFIRMED');
  if (cloneOn && !consent) return b.record('blocked', 'Voice clone enabled without consent confirmation', { category:
'voice_ai', severity: 'critical', recommendedFix: 'Disable voice clone or confirm consent flag.' });
  const key = b.envSet('VOICE_AI_PROVIDER_KEY') || b.envSet('ELEVENLABS_API_KEY');
  return key ? b.record('healthy', 'Voice AI present with provider key', { category: 'voice_ai' }) : b.record('warning',
'Voice AI present but no provider key', { category: 'voice_ai', recommendedFix: 'Set a voice provider key in .env.' });
}
module.exports = { health };
