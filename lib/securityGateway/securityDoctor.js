// lib/securityGateway/securityDoctor.js — Health/readiness check for the Security Gateway. Read-only.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { config } = require('./config');
const scoring = require('./securityScoring');

function exists(rel) { try { return fs.existsSync(path.join(ROOT, rel)); } catch (_e) { return false; } }
function fileHas(rel, needle) { try { return exists(rel) && fs.readFileSync(path.join(ROOT, rel), 'utf8').includes(needle); } catch (_e) { return false; } }

function run() {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

  add('route module present', exists('routes/securityGatewayRoutes.js'));
  add('server hook present', fileHas('server.js', 'SECURITY GATEWAY HOOK'));
  add('dashboard page exists', exists('public/security-gateway.html'));
  add('dashboard js exists', exists('public/js/security-gateway.js'));
  add('dashboard css exists', exists('public/css/security-gateway.css'));
  add('env placeholders present', fileHas('.env.example', 'SECURITY_GATEWAY_ENABLED'));
  add('.gitignore protects raw security logs', fileHas('.gitignore', 'security-events'));
  add('docs present', exists('docs/SECURITY_GATEWAY_COMMAND_CENTER.md'));
  add('check script present', exists('scripts/security-gateway-check.js'));
  add('smoke test present', exists('tests/smoke/securityGatewaySmoke.js'));

  // Functional checks
  try { const rl = require('./rateLimiter'); const r = rl.check({ scope: 'public_form', ip: '1.2.3.4', maxRequests: 1, windowSeconds: 60 }); rl.check({ scope: 'public_form', ip: '1.2.3.4', maxRequests: 1, windowSeconds: 60 }); const r2 = rl.check({ scope: 'public_form', ip: '1.2.3.4', maxRequests: 1, windowSeconds: 60 }); add('rate limiter works', r2.over === true && !r.keyHashed.includes('1.2.3.4')); } catch (e) { add('rate limiter works', false, e.message); }
  try { const ab = require('./abuseDetector').check({ payload: { x: '../etc/passwd' } }); add('abuse detector works', ab.abuseScore > 0 && ab.signals.length > 0); } catch (e) { add('abuse detector works', false, e.message); }
  try { const { redact, hasLeak } = require('./redactor'); const red = redact('email a@b.com phone +12345678901'); add('redaction works', !hasLeak(red)); } catch (e) { add('redaction works', false, e.message); }
  try { const { hashIp, hashUserAgent } = require('./hashUtils'); add('IP/user-agent hashing works', hashIp('9.9.9.9').startsWith('iph_') && !hashIp('9.9.9.9').includes('9.9.9.9') && hashUserAgent('UA').startsWith('uah_')); } catch (e) { add('IP/user-agent hashing works', false, e.message); }
  try { const v = require('./inputValidator').validatePublicForm({ data: { name: 'x' } }, { requireConsent: true }); add('public form guard works', v.ok === false && v.errors.includes('consent_required')); } catch (e) { add('public form guard works', false, e.message); }
  try { const s = require('./scopeGuard').check({ requiredScope: 'developer_api', providedScopes: [] }); add('developer scope guard works', s.mismatch === true); } catch (e) { add('developer scope guard works', false, e.message); }
  try { const w = require('./abuseDetector').check({ scope: 'webhook', repeatCount: 25 }); add('webhook guard works', w.signals.some((x) => x.name === 'webhook_test_spam')); } catch (e) { add('webhook guard works', false, e.message); }
  try { const t = require('./tenantIsolationGuard').check({ actorTenant: 'A', targetTenant: 'B' }); add('tenant isolation guard works', t.isolationWarning === true); } catch (e) { add('tenant isolation guard works', false, e.message); }
  try { add('audit adapter safe', typeof require('./adapters/auditLedgerAdapter').available === 'function'); } catch (e) { add('audit adapter safe', false, e.message); }
  try { add('incident adapter safe', typeof require('./adapters/incidentCommandAdapter').available === 'function'); } catch (e) { add('incident adapter safe', false, e.message); }
  add('no live enforcement by default', config.enforce === false);

  const blockers = checks.filter((c) => !c.ok && /route module|rate limiter|abuse detector|redaction|hashing/.test(c.name)).map((c) => c.name);
  const warnings = checks.filter((c) => !c.ok).map((c) => c.name).filter((n) => !blockers.includes(n));
  const score = scoring.computeScore(checks);
  const status = scoring.statusForScore(score, blockers);
  return {
    score,
    status,
    blockers,
    warnings,
    readyForLocalDemo: score >= 40 && !blockers.length,
    readyForInternalQA: score >= 50 && !blockers.length,
    readyForPublicPreview: score >= 70 && !blockers.length,
    readyForProductionPreview: score >= 85 && !blockers.length,
    readyForProductionLaunch: score >= 95 && !blockers.length,
    nextSteps: blockers.length ? blockers.map((b) => `fix: ${b}`) : (warnings.length ? warnings.map((w) => `improve: ${w}`) : ['enable enforcement in a controlled environment when ready']),
    checks,
  };
}

module.exports = { run };
