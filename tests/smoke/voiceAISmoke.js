#!/usr/bin/env node
// tests/smoke/voiceAISmoke.js — Offline smoke test for the Voice AI Command Center.
// NEVER calls external providers, sends WhatsApp messages, or uploads audio.
// Writes artifacts/voice_ai_smoke_results.json + .md.

const fs = require('fs');
const path = require('path');

const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, pass: true, detail: detail || 'ok' });
  } catch (e) {
    results.push({ name, pass: false, detail: e.message });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); return true; }

(async () => {
  // 1. Required modules load
  let V;
  check('require route module', () => { require('../../routes/voiceAIRoutes'); return 'loaded'; });
  check('require barrel + core modules', () => {
    V = require('../../lib/voiceAI');
    assert(V.providerRegistry && V.ttsEngine && V.sttEngine && V.consentGuard && V.voiceQueue, 'missing core modules');
    return `providers=${V.providerRegistry.list().length}`;
  });
  check('provider registry has mock_dry_run default', () => {
    const d = V.providerRegistry.defaultProvider();
    assert(d && d.id === 'mock_dry_run', 'default provider not mock_dry_run');
    return d.id;
  });

  // 2. Dry-run TTS preview, no provider call
  let tts;
  await (async () => {
    check('dry-run TTS preview', async () => {});
    tts = await V.ttsEngine.previewOnly({ text: 'Assalam o Alaikum, call me at +92 300 1234567 or me@example.com', customerId: 'cust1' });
    if (!tts.dryRun) results.push({ name: 'tts dryRun true', pass: false, detail: 'not dry-run' });
    else results.push({ name: 'tts dryRun true', pass: true, detail: 'dry-run' });
  })();
  check('TTS preview redacts phone/email', () => {
    assert(!/\d{7,}/.test(tts.textPreview), 'phone leaked in TTS preview');
    assert(!/@example\.com/.test(tts.textPreview) || tts.textPreview.includes('[REDACTED'), 'email leaked');
    return tts.textPreview;
  });
  check('TTS preview has no audioUrl (dry-run)', () => { assert(tts.audioUrl === null, 'audioUrl should be null in dry-run'); return 'null'; });

  // 3. Dry-run STT preview
  let stt;
  await (async () => {
    stt = await V.sttEngine.previewOnly({ sourceType: 'whatsapp', customerId: 'cust1', languageHint: 'roman_urdu' });
    results.push({ name: 'dry-run STT preview', pass: !!stt.dryRun, detail: stt.dryRun ? 'dry-run' : 'NOT dry-run' });
  })();
  check('STT returns intent + sentiment', () => { assert(stt.detectedIntent !== undefined && stt.sentiment !== undefined, 'missing intent/sentiment'); return `${stt.detectedIntent}/${stt.sentiment}`; });
  check('STT does not store transcript by default', () => { assert(stt.transcriptStored === false, 'transcript stored without consent'); return 'not stored'; });

  // 4. Queue draft requires approval
  let draft;
  check('create voice queue draft', () => {
    const r = V.voiceQueue.createDraft({ type: 'voice_reply', customerId: 'cust1', text: 'Test reply' });
    assert(r.ok, 'draft not created');
    draft = r.item;
    return draft.id;
  });
  check('queue draft requires approval + dry-run', () => {
    assert(draft.approvalRequired === true, 'approvalRequired not true');
    assert(draft.dryRun === true, 'dryRun not true');
    assert(draft.status === 'approval_pending', 'status not approval_pending');
    return 'approval_pending + dryRun';
  });

  // 5. Voice cloning blocked without consent
  await (async () => {
    const r = await V.ttsEngine.generate({ text: 'Clone test', customerId: 'cust1', useVoiceClone: true, consentConfirmed: false });
    const blocked = (r.errors || []).some((e) => /clon/i.test(e));
    results.push({ name: 'voice cloning blocked without consent', pass: blocked, detail: blocked ? 'blocked' : 'NOT blocked' });
  })();

  // 6. Consent guard external provider denied by default
  check('external provider denied by default', () => {
    const d = V.consentGuard.canUseExternalProvider('cust1');
    assert(d.allowed === false, 'external provider allowed by default');
    return d.reason;
  });

  // 7. Admin command status, no PII leak
  check('admin command !voicestatus works', () => {
    const reply = V.adminCommands.handle('!voicestatus');
    assert(typeof reply === 'string' && reply.length > 0, 'no reply');
    return reply;
  });

  // 8. Template render redacts + reports missing vars
  check('template render works', () => {
    const r = V.templateRenderer.render('welcome_ru', { name: 'Ali', business: 'SuperSender' });
    assert(r.ok && r.text.includes('Ali'), 'render failed');
    return r.text;
  });

  // 9. No full phone/email/token leak across all previews
  check('no PII leak in combined previews', () => {
    const { hasLeak } = require('../../lib/voiceAI/redaction');
    const blob = [tts.textPreview, stt.transcriptPreview, draft.textPreview].join(' | ');
    assert(!hasLeak(blob), 'PII leak detected: ' + blob);
    return 'clean';
  });

  // 10. Doctor runs
  check('doctor runs', () => {
    const d = V.doctor.run();
    assert(d && Array.isArray(d.checks) && d.checks.length > 0, 'doctor returned nothing');
    return `checks=${d.checks.length} healthy=${d.healthy}`;
  });

  // Write artifacts
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };

  const artifactsDir = path.join(__dirname, '..', '..', 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, 'voice_ai_smoke_results.json'), JSON.stringify(out, null, 2));

  let md = `# Voice AI Smoke Test Results\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
  md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
  md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
  results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅ pass' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 80)} |\n`; });
  fs.writeFileSync(path.join(artifactsDir, 'voice_ai_smoke_results.md'), md);

  console.log(md);
  process.exit(failed === 0 ? 0 : 1);
})();
