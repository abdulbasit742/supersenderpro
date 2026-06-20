// lib/tenantIsolation/isolationDoctor.js — Readiness/health check for Tenant Isolation. Read-only.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { config } = require('./config');
const scoring = require('./isolationScoring');

function exists(rel) { try { return fs.existsSync(path.join(ROOT, rel)); } catch (_e) { return false; } }
function fileHas(rel, needle) { try { return exists(rel) && fs.readFileSync(path.join(ROOT, rel), 'utf8').includes(needle); } catch (_e) { return false; } }

function run() {
  const checks = [];
  const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
  add('route mounted', fileHas('server.js', 'TENANT ISOLATION HOOK'));
  add('route module present', exists('routes/tenantIsolationRoutes.js'));
  add('dashboard page exists', exists('public/tenant-isolation.html'));
  add('dashboard js exists', exists('public/js/tenant-isolation.js'));
  add('dashboard css exists', exists('public/css/tenant-isolation.css'));
  add('env placeholders present', fileHas('.env.example', 'TENANT_ISOLATION_ENABLED'));
  add('.gitignore protections present', fileHas('.gitignore', 'tenant-isolation'));
  add('docs present', exists('docs/TENANT_ISOLATION_COMMAND_CENTER.md'));
  add('check script present', exists('scripts/tenant-isolation-check.js'));
  add('smoke test present', exists('tests/smoke/tenantIsolationSmoke.js'));
  try { const r = require('./policyRegistry'); add('boundary policies load', r.seedDefaults().length >= 12); } catch (e) { add('boundary policies load', false, e.message); }
  try { const d = require('./isolationEvaluator').decide({ actorType: 'tenant', tenantId: 'A', targetTenantId: 'B', requestsPrivateData: true }); add('evaluator works', d.allowed === false && d.blockers.includes('tenant_mismatch')); } catch (e) { add('evaluator works', false, e.message); }
  try { const r = require('./leakDetector').detect({ email: 'x@y.com', phone: '+12025550147' }); add('leak detector works', r.leakFound === true && !JSON.stringify(r).includes('x@y.com')); } catch (e) { add('leak detector works', false, e.message); }
  try { const s = require('./routeBoundaryScanner').scan(); add('route scanner works', s.summary.routesScanned > 0); } catch (e) { add('route scanner works', false, e.message); }
  try { const s = require('./storeBoundaryScanner').scan(); add('store scanner works', s.storesScanned > 0); } catch (e) { add('store scanner works', false, e.message); }
  try { const sim = require('./crossTenantSimulation').run(); add('simulations pass', sim.failed === 0 && sim.total >= 10); } catch (e) { add('simulations pass', false, e.message); }
  try { add('adapters safe', typeof require('./adapters/saasBillingAdapter').available === 'function'); } catch (e) { add('adapters safe', false, e.message); }
  try { add('security/audit/compliance adapters safe', typeof require('./adapters/securityGatewayAdapter').available === 'function' && typeof require('./adapters/auditLedgerAdapter').available === 'function'); } catch (e) { add('security/audit/compliance adapters safe', false, e.message); }
  add('no raw export by default', config.allowRawExport === false);
  try { const { redact, hasLeak } = require('./redactor'); add('redaction works', !hasLeak(redact('a@b.com +12025550147'))); } catch (e) { add('redaction works', false, e.message); }

  const blockers = checks.filter((c) => !c.ok && /route module|evaluator|leak detector|redaction|policies load/.test(c.name)).map((c) => c.name);
  const warnings = checks.filter((c) => !c.ok).map((c) => c.name).filter((n) => !blockers.includes(n));
  const score = scoring.computeScore(checks);
  const status = scoring.statusForScore(score, blockers);
  return {
    score, status, blockers, warnings,
    readyForLocalDemo: score >= 40 && !blockers.length,
    readyForInternalQA: score >= 50 && !blockers.length,
    readyForPilotTenant: score >= 70 && !blockers.length,
    readyForPublicPreview: score >= 85 && !blockers.length,
    readyForProductionLaunch: score >= 95 && !blockers.length,
    nextSteps: blockers.length ? blockers.map((b) => `fix: ${b}`) : (warnings.length ? warnings.map((w) => `improve: ${w}`) : ['enable controlled enforcement when ready']),
    checks,
  };
}
module.exports = { run };
