#!/usr/bin/env node
// tests/smoke/tenantIsolationSmoke.js — Offline smoke test. No external APIs, no real private data, no live mutation.
// Writes artifacts/tenant_isolation_smoke.{json,md}.
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let TI;
check('require barrel', () => { TI = require('../../lib/tenantIsolation'); assert(TI.isolationEvaluator && TI.isolationDoctor, 'barrel incomplete'); return 'ok'; });
check('require boundary policy', () => { assert(TI.policyRegistry.seedDefaults().length >= 12, 'policies missing'); return 'ok'; });
check('require evaluator', () => { require('../../lib/tenantIsolation/isolationEvaluator'); return 'ok'; });
check('require leak detector', () => { require('../../lib/tenantIsolation/leakDetector'); return 'ok'; });
check('require route scanner', () => { require('../../lib/tenantIsolation/routeBoundaryScanner'); return 'ok'; });
check('require store scanner', () => { require('../../lib/tenantIsolation/storeBoundaryScanner'); return 'ok'; });
check('require cross-tenant simulation', () => { require('../../lib/tenantIsolation/crossTenantSimulation'); return 'ok'; });
check('require isolation doctor', () => { require('../../lib/tenantIsolation/isolationDoctor'); return 'ok'; });
check('require route module', () => { require('../../routes/tenantIsolationRoutes'); return 'loaded'; });

check('default posture is dry-run', () => { assert(TI.config.dryRun === true, 'not dry-run'); return 'dryRun=true'; });
check('raw export disabled by default', () => { assert(TI.config.allowRawExport === false, 'raw export enabled'); return 'no raw export'; });
check('Tenant A reading Tenant B is blocked', () => { const d = TI.isolationEvaluator.decide({ actorType: 'tenant', tenantId: 'T_A', targetTenantId: 'T_B', resourceType: 'customer', requestsPrivateData: true }); assert(d.allowed === false && d.blockers.includes('tenant_mismatch'), 'cross-tenant not blocked'); return d.riskLevel; });
check('assigned reseller client preview allowed', () => { const d = TI.isolationEvaluator.decide({ actorType: 'reseller', resellerId: 'R1', assignedClientIds: ['C1', 'C2'], targetClientId: 'C1' }); assert(d.allowed === true, 'assigned client blocked'); return 'allowed'; });
check('unassigned reseller client blocked', () => { const d = TI.isolationEvaluator.decide({ actorType: 'reseller', resellerId: 'R1', assignedClientIds: ['C1'], targetClientId: 'C9' }); assert(d.allowed === false && d.blockers.includes('client_not_assigned'), 'unassigned not blocked'); return 'blocked'; });
check('public requesting private data blocked', () => { const d = TI.isolationEvaluator.decide({ actorType: 'public', requestsPrivateData: true }); assert(d.allowed === false, 'public private not blocked'); return 'blocked'; });
check('developer insufficient scope blocked', () => { const d = TI.isolationEvaluator.decide({ actorType: 'developer_app', requiredScope: 'billing:read', providedScopes: ['public:read'] }); assert(d.allowed === false && d.blockers.includes('developer_scope_insufficient'), 'scope not enforced'); return 'blocked'; });
check('payload scan redacts phone/email/token', () => { const r = TI.leakDetector.detect({ email: 'jane@example.com', phone: '+12025550147', token: 'a'.repeat(40) }); assert(r.leakFound === true, 'no leak found'); const s = JSON.stringify(r); assert(s.indexOf('jane@example.com') === -1 && s.indexOf('2025550147') === -1, 'raw pii leaked'); return `${r.leakCount} findings`; });
check('secret in payload detected', () => { const secret = 'sk_' + 'live_' + 'z'.repeat(28); const r = TI.leakDetector.detect({ key: secret }); assert(r.findings.some((f) => f.type === 'api_key'), 'secret not flagged'); return 'flagged'; });
check('route scanner runs', () => { const s = TI.routeBoundaryScanner.scan(); assert(s.summary.routesScanned > 0, 'no routes scanned'); return `${s.summary.routesScanned} routes`; });
check('store scanner runs (source-only)', () => { const s = TI.storeBoundaryScanner.scan(); assert(s.storesScanned > 0, 'no source scanned'); return `${s.storesScanned} files`; });
check('simulations all pass', () => { const sim = TI.crossTenantSimulation.run(); assert(sim.total >= 10 && sim.failed === 0, `${sim.failed} sims failed`); return `${sim.passed}/${sim.total}`; });
check('doctor produces score + status', () => { const d = TI.isolationDoctor.run(); assert(typeof d.score === 'number' && Array.isArray(d.blockers), 'bad doctor'); return `${d.score}/100 ${d.status}`; });
check('no raw export from report', () => { const g = TI.safetyGuard.guardRawExport(true); assert(g.blocked === true, 'raw export not blocked'); return 'blocked'; });
check('no full phone/email/token leaks in snapshot', () => { const { hasLeak } = TI.redactor; const snap = JSON.stringify({ leaks: TI.leakDetector.listLeaks(20), policies: TI.policyRegistry.list() }); assert(!hasLeak(snap), 'leak detected'); return 'clean'; });

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'tenant_isolation_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Tenant Isolation Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'tenant_isolation_smoke.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
