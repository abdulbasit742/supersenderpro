// lib/voiceAI/doctor.js — Health check for the Voice AI Command Center. Returns a list of
// checks with ok/warn/fail status. Never throws; safe to call from a route or a script.

const fs = require('fs');
const { config, hasEnvKeys } = require('./config');
const providerConfig = require('./providerConfig');

function run() {
  const checks = [];
  const add = (id, status, message) => checks.push({ id, status, message });

  add('voice_ai_enabled', config.enabled ? 'ok' : 'warn', `VOICE_AI_ENABLED=${config.enabled}`);
  add('dry_run_default', config.dryRun ? 'ok' : 'warn', `Dry-run is ${config.dryRun ? 'ON (safe)' : 'OFF'}`);
  add('approval_required', config.requireApproval ? 'ok' : 'warn', `Approval required: ${config.requireApproval}`);

  // Live enabled but no consent guard implications
  if (config.allowLiveTTS && !config.requireApproval) add('live_tts_guard', 'warn', 'Live TTS enabled without approval requirement.');
  else add('live_tts_guard', 'ok', 'Live TTS guard ok.');
  if (config.allowLiveSTT && !config.storeTranscripts) add('live_stt_guard', 'ok', 'Live STT on, transcript storage off (safe).');
  else add('live_stt_guard', 'ok', 'STT guard ok.');

  // Voice clone guard
  if (config.allowVoiceCloning) add('voice_clone_guard', 'warn', 'Voice cloning globally enabled — ensure per-subject consent.');
  else add('voice_clone_guard', 'ok', 'Voice cloning disabled (safe default).');

  // Providers: enabled but missing key
  for (const p of Object.values(providerConfig)) {
    if (p.requiresApiKey && !hasEnvKeys(p.envKeys)) {
      add(`provider_${p.id}`, 'warn', `${p.label} configured but missing key(s): ${p.envKeys.join(', ')}`);
    } else {
      add(`provider_${p.id}`, 'ok', `${p.label} ready (${p.requiresApiKey ? 'key present' : 'no key needed'}).`);
    }
  }

  // Audio storage path
  if (config.storeAudio) {
    const exists = (() => { try { return fs.existsSync(config.paths.audioStore); } catch (_e) { return false; } })();
    add('audio_store_path', exists ? 'ok' : 'warn', exists ? 'Audio store dir present.' : 'Audio store dir missing (will be created on first use).');
  } else {
    add('audio_store_path', 'ok', 'Audio storage disabled (safe default).');
  }

  add('external_provider_default', (!config.effective.liveTTS && !config.effective.liveSTT) ? 'ok' : 'warn',
    (!config.effective.liveTTS && !config.effective.liveSTT) ? 'No live external provider active.' : 'A live external provider is active.');

  const summary = {
    ok: checks.filter((c) => c.status === 'ok').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  };
  return { healthy: summary.fail === 0, summary, checks, dryRun: config.dryRun, generatedAt: new Date().toISOString() };
}

module.exports = { run };
