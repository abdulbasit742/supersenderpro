#!/usr/bin/env node
// scripts/tenant-isolation-check.js — Validates Tenant Isolation install + safe sample runs.
// Never exposes secrets/full PII/raw tenant data. Exit 0 unless TENANT_ISOLATION_STRICT=true and blockers exist.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const TI = require('../lib/tenantIsolation');
const { hasLeak } = require('../lib/tenantIsolation/redactor');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));
const fileHas = (r, s) => exists(r) && fs.readFileSync(path.join(ROOT, r), 'utf8').includes(s);

add('route module present', exists('routes/tenantIsolationRoutes.js'));
add('server hook present', fileHas('server.js', 'TENANT ISOLATION HOOK'));
add('dashboard page present', exists('public/tenant-isolation.html'));
add('dashboard js present', exists('public/js/tenant-isolation.js'));
add('dashboard css present', exists('public/css/tenant-isolation.css'));
add('env placeholders present', fileHas('.env.example', 'TENANT_ISOLATION_ENABLED'));
add('gitignore protections present', fileHas('.gitignore', 'tenant-isolation'));
['TENANT_ISOLATION_COMMAND_CENTER.md', 'WORKSPACE_BOUNDARY_POLICIES.md', 'API_RESPONSE_LEAK_DETECTION.md'].forEach((d) => add(`doc ${d}`, exists(`docs/${d}`)));

let outputs = {};
try {
  const policies = TI.policyRegistry.seedDefaults();
  add('boundary policies load', policies.length >= 12);
  const t = TI.isolationEvaluator.decide({ actorType: 'tenant', tenantId: 'T_A', targetTenantId: 'T_B', requestsPrivateData: true });
  add('sample tenant access blocked', t.allowed === false && t.blockers.includes('tenant_mismatch'));
  const r = TI.isolationEvaluator.decide({ actorType: 'reseller', resellerId: 'R1', assignedClientIds: ['C1'], targetClientId: 'C1' });
  add('sample reseller assigned allowed', r.allowed === true);
  const leak = TI.leakDetector.detect({ email: 'a@b.com', phone: '+12025550147', token: 'x'.repeat(40) });
  add('payload leak detector redacts', leak.leakFound === true && !JSON.stringify(leak).includes('a@b.com'));
  const routes = TI.routeBoundaryScanner.scan();
  add('route scanner runs', routes.summary.routesScanned > 0);
  const stores = TI.storeBoundaryScanner.scan();
  add('store scanner runs', stores.storesScanned > 0);
  const sim = TI.crossTenantSimulation.run();
  add('cross-tenant simulations pass', sim.failed === 0 && sim.total >= 10);
  outputs = { t, r, leak, routes: routes.summary, stores: { n: stores.storesScanned }, sim: { passed: sim.passed } };
} catch (e) { add('functional pipeline', false, e.message); }

add('no secret/full-PII/raw leak in outputs', !hasLeak(JSON.stringify(outputs)));
const doctor = TI.isolationDoctor.run();
add('doctor produces score', typeof doctor.score === 'number');

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const blockers = doctor.blockers || [];
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, doctorScore: doctor.score, doctorStatus: doctor.status, blockers, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'tenant_isolation_check.json'), JSON.stringify(out, null, 2));
let md = `# Tenant Isolation Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed** — doctor score ${doctor.score}/100 (${doctor.status})\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'tenant_isolation_check.md'), md);
console.log(md);
const strict = String(process.env.TENANT_ISOLATION_STRICT || '').toLowerCase() === 'true';
process.exit(strict && blockers.length ? 1 : 0);
