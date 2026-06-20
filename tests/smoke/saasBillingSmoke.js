#!/usr/bin/env node
// tests/smoke/saasBillingSmoke.js — Offline smoke test. No external APIs, no payment capture,
// no live sends, no tenant suspension. Writes artifacts/saas_billing_smoke.{json,md}.
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

const TENANT = '__smoke_tenant__';
let S;

check('require plan registry', () => { const pr = require('../../lib/saasBilling/planRegistry'); assert(pr.getPlans().length >= 8, 'plans missing'); return `${pr.getPlans().length} plans`; });
check('require license engine', () => { require('../../lib/saasBilling/licenseEngine'); return 'ok'; });
check('require usage meter', () => { require('../../lib/saasBilling/usageMeter'); return 'ok'; });
check('require quota checker', () => { require('../../lib/saasBilling/quotaChecker'); return 'ok'; });
check('require invoice builder', () => { require('../../lib/saasBilling/invoiceBuilder'); return 'ok'; });
check('require feature gate', () => { require('../../lib/saasBilling/featureGate'); return 'ok'; });
check('require barrel', () => { S = require('../../lib/saasBilling'); assert(S.doctor && S.billingStatus, 'barrel incomplete'); return 'ok'; });
check('route module requires', () => { require('../../routes/saasBillingRoutes'); return 'loaded'; });

let lic, inv;
check('create sample tenant + assign starter plan', () => { S.tenantPlans.assignTenantPlan(TENANT, 'starter'); assert(S.tenantPlans.getTenantPlanId(TENANT) === 'starter', 'plan not assigned'); return 'starter'; });
check('issue license (trial, masked key)', () => { lic = S.licenseEngine.issueLicense(TENANT, 'starter'); assert(/\*/.test(lic.licenseKeyMasked), 'key not masked'); assert(!('licenseKeyHash' in lic), 'hash leaked'); return lic.status; });
check('record sample usage', () => { const e = S.usageMeter.record({ tenantId: TENANT, feature: 'channel_automation', metric: 'channel_posts', amount: 5, sourceModule: 'smoke' }); assert(e.id, 'no event'); return `${e.amount} ${e.metric}`; });
check('usage record is dry-run aware', () => { const e = S.usageMeter.record({ tenantId: TENANT, metric: 'api_calls', amount: 1, sourceModule: 'smoke' }); assert(typeof e.dryRun === 'boolean', 'no dryRun flag'); return `dryRun=${e.dryRun}`; });
check('check quota (warn-only)', () => { const q = S.quotaChecker.checkTenant(TENANT); assert(q.warnOnly === true, 'not warn-only'); return q.overallLevel; });
check('build invoice draft', () => { inv = S.invoiceBuilder.createDraft({ tenantId: TENANT, planId: 'starter' }); assert(inv.status === 'draft', 'not draft'); assert(inv.amount >= 0, 'no amount'); return inv.invoiceNumber; });
check('mark-paid stays manual review (no auto-capture)', () => { const r = S.invoiceBuilder.markPaidForReview(inv.id, { paymentReference: 'TXN-SECRET-123456' }); assert(r.manualReviewRequired === true && r.autoVerified === false, 'auto-verified unexpectedly'); assert(r.invoice.paymentReferenceMasked.indexOf('123456') === -1, 'full ref stored'); return 'manual review'; });
check('feature gate warn-only behavior', () => { const g = S.featureGate.check({ tenantId: TENANT, feature: 'voice_ai', action: 'use' }); assert(g.warnOnly === true && g.allowed === true, 'gate blocked in default posture'); assert(g.upgradeRequired === true, 'should flag upgrade'); return `suggest ${g.suggestedPlan}`; });
check('preview enforcement does not change posture', () => { const p = S.featureGate.previewEnforcement({ tenantId: TENANT, feature: 'voice_ai', action: 'use' }); assert(p.preview === true, 'not preview'); assert(p.currentlyEnforcing === false, 'should not be enforcing'); return 'preview ok'; });
check('protected actions never blocked', () => { const g = S.featureGate.check({ tenantId: TENANT, feature: 'voice_ai', action: '/api/login' }); assert(g.allowed === true, 'login blocked!'); return 'login safe'; });
check('plan change preview requires approval', () => { const p = S.planChange.preview({ tenantId: TENANT, toPlanId: 'pro' }); assert(p.approvalRequired === true, 'no approval gate'); return p.direction; });
check('reseller register + commission (no payout)', () => { const r = S.resellerManager.registerReseller({ name: 'Test Reseller', email: 'a@b.com', commissionRate: 0.2 }); const c = S.resellerManager.recordCommission({ resellerId: r.id, invoiceId: inv.id, amount: inv.amount }); assert(c.payoutStatus === 'unpaid', 'payout processed!'); return 'unpaid'; });
check('doctor produces score', () => { const d = S.doctor.run(); assert(typeof d.score === 'number' && Array.isArray(d.blockers), 'bad doctor output'); return `${d.score}/100 ${d.status}`; });
check('no license/payment refs leak in output', () => { const { hasLeak } = require('../../lib/saasBilling/privacy'); assert(!hasLeak(JSON.stringify({ lic, inv })), 'leak detected'); return 'clean'; });
check('reports build', () => { const rep = S.reportBuilder.all(); assert(rep.generatedAt && rep.mrr, 'no report'); const md = S.reportBuilder.toMarkdown(rep); assert(md.length > 0, 'no md'); return 'ok'; });

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'saas_billing_smoke.json'), JSON.stringify(out, null, 2));
let md = `# SaaS Billing Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'saas_billing_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
