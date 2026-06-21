#!/usr/bin/env node
// tests/smoke/platformControlSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let pc, red;
check('require platform control api', () => { pc = require('../../lib/platformControl'); assert(pc.getPlatformControlStatus, 'no api'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/platformControl/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/platformControlRoutes'); return 'loaded'; });

function assertSafe(resp, label) {
  assert(resp && resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.readOnly === true, `${label}: readOnly not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  assert(resp.secretsExposed === false || resp.secretsExposed === undefined, `${label}: secretsExposed truthy`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k)) assert(v === false, `${label}: ${k} is truthy`);
  }
  assert(red.hasLeak(resp) === false, `${label}: response leaked pii/secret/stack`);
  return true;
}

check('getPlatformControlStatus works + safe', () => { const s = pc.getPlatformControlStatus(); assertSafe(s, 'status'); assert(s.platformControlEnabled === true, 'enabled'); return `${s.supportedModules.length} modules`; });
check('getPlatformSummary works + safe', () => { const s = pc.getPlatformSummary(); assertSafe(s, 'summary'); assert(typeof s.totalModulesPreview === 'number', 'modules'); return `score ${s.readinessScorePreview}`; });
check('module registry works', () => { const r = pc.getModuleRegistry(); assertSafe(r, 'modules'); assert(Array.isArray(r.modulesPreview), 'arr'); return `${r.totalPreview} modules`; });
check('route inventory works', () => { const r = pc.getRouteInventory(); assertSafe(r, 'routes'); assert(Array.isArray(r.routesPreview), 'arr'); return `${r.totalPreview} routes`; });
check('dashboard registry works', () => { const r = pc.getDashboardRegistry(); assertSafe(r, 'dash'); assert(Array.isArray(r.pagesPreview), 'arr'); return `${r.totalPagesPreview} pages`; });
check('feature flags works', () => { const r = pc.getFeatureFlags(); assertSafe(r, 'flags'); assert(Array.isArray(r.flagsPreview), 'arr'); return `${r.totalPreview} flags`; });

check('env readiness works without exposing values', () => { const r = pc.getEnvReadiness(); assertSafe(r, 'env'); assert(r.secretsExposed === false, 'secrets'); assert(red.hasLeak(r) === false, 'leak'); return `${r.totalDeclaredPreview} declared`; });
check('secret presence works without exposing values', () => { const r = pc.getSecretPresence(); assertSafe(r, 'secrets'); assert(r.secretPresencePreview.every((s) => /configured|not_configured/.test(s.valueMasked)), 'value'); return `${r.secretPresencePreview.length} keys`; });
check('whatsapp readiness works without live send', () => { const r = pc.getWhatsAppReadiness(); assertSafe(r, 'wa'); assert(r.liveSendEnabled === false, 'send'); return 'safe'; });
check('whatsapp cloud readiness works without meta api', () => { const r = pc.getCloudApiReadiness(); assertSafe(r, 'cloud'); assert(r.liveMetaApiEnabled === false, 'meta'); return 'safe'; });
check('ai readiness works without live ai call', () => { const r = pc.getAiProviderReadiness(); assertSafe(r, 'ai'); assert(r.liveAiCallEnabled === false, 'ai'); return `${r.configuredProvidersMaskedPreview.length} providers`; });
check('rag readiness works without connectivity', () => { const r = pc.getRagReadiness(); assertSafe(r, 'rag'); assert(r.liveVectorQueryEnabled === false, 'vec'); return 'safe'; });
check('queue readiness works without redis', () => { const r = pc.getQueueReadiness(); assertSafe(r, 'queue'); assert(r.inMemoryFallbackAvailablePreview === true, 'fallback'); return 'safe'; });
check('database readiness works without db', () => { const r = pc.getDatabaseReadiness(); assertSafe(r, 'db'); assert(r.dbConnectionRequiredToStart === false, 'conn'); return 'safe'; });
check('storage readiness works', () => { const r = pc.getStorageReadiness(); assertSafe(r, 'storage'); return 'safe'; });
check('integration health works without external calls', () => { const r = pc.getIntegrationHealth(); assertSafe(r, 'integ'); assert(r.externalCallsEnabled === false, 'ext'); return `${r.totalDetectedPreview} detected`; });
check('webhook readiness works', () => { const r = pc.getWebhookReadiness(); assertSafe(r, 'wh'); assert(r.liveWebhookDispatchEnabled === false, 'wh'); return 'safe'; });
check('campaign readiness works', () => { const r = pc.getCampaignReadiness(); assertSafe(r, 'camp'); assert(r.liveCampaignSendEnabled === false, 'send'); return 'safe'; });
check('rate limit readiness works', () => { const r = pc.getRateLimitReadiness(); assertSafe(r, 'rl'); return 'safe'; });
check('backup readiness works', () => { const r = pc.getBackupReadiness(); assertSafe(r, 'bk'); assert(r.liveBackupExecution === false, 'bk'); return 'safe'; });
check('deployment checklist works', () => { const r = pc.getDeploymentChecklist(); assertSafe(r, 'dep'); assert(Array.isArray(r.checklistPreview), 'arr'); return `${r.readyCountPreview}/${r.totalPreview} ready`; });

check('safety guard report works', () => { const r = pc.getSafetyGuardReport(); assertSafe(r, 'guard'); assert(Array.isArray(r.safetySignalsPreview), 'arr'); return `${r.safetySignalsPreview.length} signals`; });
check('pii leak preview masks data', () => { const r = pc.getPiiLeakPreview(); assertSafe(r, 'pii'); assert(r.piiMasked === true, 'masked'); return `${r.totalFindingsPreview} findings`; });
check('duplicate detector works', () => { const r = pc.getDuplicateReport(); assertSafe(r, 'dup'); return 'ok'; });
check('broken reference scanner works', () => { const r = pc.getBrokenReferences(); assertSafe(r, 'broken'); return `${r.totalBrokenPreview} broken`; });
check('log preview masks data + no raw logs', () => { const r = pc.getLogPreview(); assertSafe(r, 'log'); assert(r.rawLogsExposed === false && r.piiMasked === true, 'raw'); return `${r.logsPreview.length} logs`; });
check('audit preview safe + no raw audit', () => { const r = pc.getAuditPreview(); assertSafe(r, 'audit'); assert(r.rawAuditExposed === false, 'raw'); return 'safe'; });

check('release readiness score works', () => { const r = pc.getReleaseReadinessScore(); assertSafe(r, 'release'); assert(typeof r.scorePreview === 'number', 'score'); return `${r.scorePreview} (${r.gradePreview})`; });
check('risk score works', () => { const r = pc.getRiskScore(); assertSafe(r, 'risk'); assert(typeof r.riskScorePreview === 'number', 'score'); return `${r.riskScorePreview} (${r.riskLevelPreview})`; });
check('recommendations work', () => { const r = pc.getRecommendations(); assertSafe(r, 'rec'); assert(Array.isArray(r.recommendationsPreview), 'arr'); return `${r.totalPreview} recs`; });

check('checks preview never executes', () => { const r = pc.getChecksPreview(); assertSafe(r, 'checks'); assert(r.liveScriptExecution === false, 'exec'); return 'safe'; });
check('checks run-preview never executes', () => { const r = pc.runChecksPreview(); assertSafe(r, 'checks-run'); assert(r.executed === false, 'exec'); return 'safe'; });
check('smoke preview works', () => { const r = pc.getSmokeTestsPreview(); assertSafe(r, 'smoke'); return `${r.totalSmokePreview} smoke`; });
check('smoke run-preview never executes', () => { const r = pc.runSmokeTestsPreview(); assertSafe(r, 'smoke-run'); assert(r.executed === false, 'exec'); return 'safe'; });

check('missing modules do not crash', () => { const r = pc.getModuleRegistry(); assert(r.ok !== undefined, 'ok'); return 'no crash'; });
check('redactor phone exact', () => { assert(red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567')); return 'ok'; });
check('redactor email exact', () => { assert(/^us\*+@example\.com$/.test(red.maskEmail('user@example.com')), red.maskEmail('user@example.com')); return 'ok'; });
check('no secrets/full PII in sampled responses', () => {
  const sample = [pc.getPlatformControlStatus(), pc.getEnvReadiness(), pc.getSecretPresence(), pc.getLogPreview(), pc.getAuditPreview(), pc.getPlatformSummary()];
  assert(red.hasLeak(sample) === false, 'leak detected'); return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'platform_control_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Platform Control Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'platform_control_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
