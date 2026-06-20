#!/usr/bin/env node
// tests/smoke/securityGatewaySmoke.js — Offline smoke test. No external APIs, no live blocking, no real secrets.
// Verifies dry-run posture, hashing, redaction, rate limiting, abuse scoring. Writes artifacts/security_gateway_smoke.{json,md}.
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let SG;
check('require barrel', () => { SG = require('../../lib/securityGateway'); assert(SG.securityGateway && SG.securityDoctor, 'barrel incomplete'); return 'ok'; });
check('require security policy', () => { assert(require('../../lib/securityGateway/securityPolicy').seedDefaults().length > 0, 'no defaults'); return 'ok'; });
check('require rate limiter', () => { require('../../lib/securityGateway/rateLimiter'); return 'ok'; });
check('require abuse detector', () => { require('../../lib/securityGateway/abuseDetector'); return 'ok'; });
check('require input validator', () => { require('../../lib/securityGateway/inputValidator'); return 'ok'; });
check('require scope guard', () => { require('../../lib/securityGateway/scopeGuard'); return 'ok'; });
check('require tenant isolation guard', () => { require('../../lib/securityGateway/tenantIsolationGuard'); return 'ok'; });
check('require security event writer', () => { require('../../lib/securityGateway/securityEventWriter'); return 'ok'; });
check('require security doctor', () => { require('../../lib/securityGateway/securityDoctor'); return 'ok'; });
check('require route module', () => { require('../../routes/securityGatewayRoutes'); return 'loaded'; });

check('default posture is dry-run', () => { const s = SG.securityGateway.status(); assert(s.dryRun === true, 'not dry-run'); return 'dryRun=true'; });
check('enforcement disabled by default', () => { assert(SG.config.enforce === false, 'enforce should be false'); return 'enforce=false'; });
check('IP hashing never returns raw IP', () => { const h = SG.hashUtils.hashIp('198.51.100.23'); assert(h.startsWith('iph_') && !h.includes('198.51.100.23'), 'raw ip leaked'); return h; });
check('user-agent hashing works', () => { const h = SG.hashUtils.hashUserAgent('Mozilla/5.0 secret'); assert(h.startsWith('uah_') && !h.includes('secret'), 'ua leaked'); return 'hashed'; });
check('PII/token redaction works', () => { const r = SG.redactor.redact('email user@example.com phone +12025550147 token abcdefghijklmnopqrstuvwxyz12'); assert(!SG.redactor.hasLeak(r), 'leak after redact'); assert(r.indexOf('user@example.com') === -1, 'email not redacted'); return 'clean'; });
check('rate limit warning works', () => { const k = { scope: 'public_form', ip: '192.0.2.55', maxRequests: 2, windowSeconds: 60 }; SG.rateLimiter.check(k); SG.rateLimiter.check(k); const third = SG.rateLimiter.check(k); assert(third.over === true && third.warning === true, 'no warning'); assert(third.blockedLive === false, 'blocked live in default posture!'); return `retryAfter=${third.retryAfterSeconds}`; });
check('abuse score works', () => { const a = SG.abuseDetector.check({ scope: 'webhook', repeatCount: 25, payload: { x: 'union select * from users' } }); assert(a.abuseScore > 0 && ['low','medium','high','critical'].includes(a.riskLevel), 'bad score'); return `${a.abuseScore}/${a.riskLevel}`; });
check('secret-in-payload detected', () => { const fakeSecret = 'sk_' + 'live_' + 'a'.repeat(24); const a = SG.abuseDetector.check({ payload: { key: fakeSecret } }); assert(a.signals.some((s) => s.name === 'secret_in_payload'), 'secret not flagged'); return 'flagged'; });
check('public form guard requires consent', () => { const v = SG.inputValidator.validatePublicForm({ data: { name: 'x' } }, { requireConsent: true }); assert(v.ok === false && v.errors.includes('consent_required'), 'consent not enforced'); return 'consent enforced'; });
check('scope guard preview does not block by default', () => { const s = SG.scopeGuard.check({ requiredScope: 'developer_api', providedScopes: [] }); assert(s.mismatch === true && s.allowed === true, 'blocked in preview'); return 'preview'; });
check('tenant isolation guard warns on mismatch', () => { const t = SG.tenantIsolationGuard.check({ actorTenant: 'A', targetTenant: 'B' }); assert(t.isolationWarning === true && t.allowed === true, 'should warn-not-block'); return 'warn'; });
check('security event is redacted', () => { const { event } = SG.securityEventWriter.write({ eventType: 'pii_in_payload', riskLevel: 'high', summary: 'contact a@b.com +12025550147', ip: '203.0.113.9', userAgent: 'UA', metadata: { secret: 'sk_live_xyz', email: 'a@b.com' } }); assert(event.ipHash.startsWith('iph_') && !JSON.stringify(event).includes('203.0.113.9'), 'raw ip in event'); assert(JSON.stringify(event.metadataRedacted).indexOf('sk_live_xyz') === -1, 'secret in event'); return event.id; });
check('doctor produces score + status', () => { const d = SG.securityDoctor.run(); assert(typeof d.score === 'number' && Array.isArray(d.blockers), 'bad doctor'); return `${d.score}/100 ${d.status}`; });
check('no raw IP/full phone/email/token leaks', () => { const { hasLeak } = SG.redactor; const snapshot = JSON.stringify({ status: SG.securityGateway.status(), events: SG.securityEventWriter.list(20), signals: SG.suspiciousActivity.list(20) }); assert(!hasLeak(snapshot), 'leak detected'); return 'clean'; });

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'security_gateway_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Security Gateway Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'security_gateway_smoke.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
