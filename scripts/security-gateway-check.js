#!/usr/bin/env node
// scripts/security-gateway-check.js — Validates Security Gateway install + runs safe sample checks.
// Never exposes secrets / raw IP / full PII. Exit 0 unless SECURITY_GATEWAY_STRICT=true and blockers exist.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SG = require('../lib/securityGateway');
const { hasLeak } = require('../lib/securityGateway/redactor');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));
const fileHas = (r, s) => exists(r) && fs.readFileSync(path.join(ROOT, r), 'utf8').includes(s);

// File presence
add('route module present', exists('routes/securityGatewayRoutes.js'));
add('server hook present', fileHas('server.js', 'SECURITY GATEWAY HOOK'));
add('dashboard page present', exists('public/security-gateway.html'));
add('dashboard js present', exists('public/js/security-gateway.js'));
add('dashboard css present', exists('public/css/security-gateway.css'));
add('env placeholders present', fileHas('.env.example', 'SECURITY_GATEWAY_ENABLED'));
add('gitignore protects security logs', fileHas('.gitignore', 'security-events'));
['SECURITY_GATEWAY_COMMAND_CENTER.md', 'RATE_LIMIT_POLICY.md', 'ABUSE_PROTECTION.md'].forEach((d) => add(`doc ${d}`, exists(`docs/${d}`)));

// Functional samples
let sampleOutputs = {};
try {
  const pol = SG.securityPolicy.create({ name: 'sample check policy', scope: 'public_form', maxRequests: 2, windowSeconds: 60 });
  add('sample policy created', !!pol.id);
  const rl1 = SG.rateLimiter.check({ scope: 'public_form', ip: '203.0.113.7', maxRequests: 2, windowSeconds: 60 });
  SG.rateLimiter.check({ scope: 'public_form', ip: '203.0.113.7', maxRequests: 2, windowSeconds: 60 });
  const rl3 = SG.rateLimiter.check({ scope: 'public_form', ip: '203.0.113.7', maxRequests: 2, windowSeconds: 60 });
  add('rate limit sample check', rl1.over === false && rl3.over === true);
  add('rate limit key is hashed (no raw IP)', !JSON.stringify(rl3).includes('203.0.113.7'));
  const ab = SG.abuseDetector.check({ scope: 'public_form', repeatCount: 20, consent: false, payload: { msg: '<script>alert(1)</script>' } });
  add('sample abuse detection', ab.abuseScore > 0 && ab.signals.length > 0);
  const vf = SG.inputValidator.validatePublicForm({ data: { name: 'a', evil: '../x' } }, { requireConsent: true, allowedFields: ['name'] });
  add('sample public form validation', vf.ok === false);
  const sg = SG.scopeGuard.check({ requiredScope: 'developer_api', providedScopes: ['public_api'] });
  add('sample developer scope validation', sg.mismatch === true);
  const wh = SG.inputValidator.validateGeneric({ body: 'normal payload' }, { flagPii: true });
  add('sample webhook validation', typeof wh.ok === 'boolean');
  const ti = SG.tenantIsolationGuard.check({ actorTenant: 'tenantA', targetTenant: 'tenantB' });
  add('tenant isolation sample check', ti.isolationWarning === true);
  add('live enforcement disabled by default', SG.config.enforce === false);
  sampleOutputs = { pol, rl3, ab, vf, sg, wh, ti };
} catch (e) { add('functional pipeline', false, e.message); }

add('no secret/raw-IP/PII leak in outputs', !hasLeak(JSON.stringify(sampleOutputs)));

const doctor = SG.securityDoctor.run();
add('doctor produces score', typeof doctor.score === 'number');

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const blockers = doctor.blockers || [];
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, doctorScore: doctor.score, doctorStatus: doctor.status, blockers, checks };

const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'security_gateway_check.json'), JSON.stringify(out, null, 2));
let md = `# Security Gateway Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed** — doctor score ${doctor.score}/100 (${doctor.status})\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'security_gateway_check.md'), md);
console.log(md);

const strict = String(process.env.SECURITY_GATEWAY_STRICT || '').toLowerCase() === 'true';
process.exit(strict && blockers.length ? 1 : 0);
