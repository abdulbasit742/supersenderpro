#!/usr/bin/env node
// scripts/saas-billing-check.js — Validates the SaaS Billing install + runs the doctor.
// Never exposes secrets. Writes artifacts/saas_billing_check.{json,md}. Exit 1 only on blockers.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const S = require('../lib/saasBilling');
const { hasLeak } = require('../lib/saasBilling/privacy');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// File presence
add('route module present', exists('routes/saasBillingRoutes.js'));
add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('SAAS BILLING HOOK'));
add('dashboard page present', exists('public/saas-billing.html'));
add('dashboard js present', exists('public/js/saas-billing.js'));
add('dashboard css present', exists('public/css/saas-billing.css'));
add('env placeholders present', exists('.env.example') && fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8').includes('SAAS_BILLING_ENABLED'));
['SAAS_BILLING_COMMAND_CENTER.md', 'SAAS_PLANS_AND_LIMITS.md', 'SAAS_LICENSE_ENGINE.md', 'SAAS_USAGE_METERING.md', 'SAAS_RESELLER_PORTAL.md', 'SAAS_BILLING_SAFETY.md', 'SAAS_PAYMENT_ADAPTERS.md'].forEach((d) => add(`doc ${d}`, exists(`docs/${d}`)));

// Functional pipeline (offline, dry-run)
let lic, inv, doctorOut;
try {
  add('plans seeded', S.planRegistry.getPlans().length >= 8);
  lic = S.licenseEngine.issueLicense('__check_tenant__', 'starter');
  add('license issued (trial)', lic && lic.status === 'trial' && /\*/.test(lic.licenseKeyMasked));
  S.usageMeter.record({ tenantId: '__check_tenant__', feature: 'channel_automation', metric: 'channel_posts', amount: 3, sourceModule: 'check' });
  const q = S.quotaChecker.checkTenant('__check_tenant__');
  add('quota warn-only', q.warnOnly === true);
  const gate = S.featureGate.check({ tenantId: '__check_tenant__', feature: 'voice_ai', action: 'use' });
  add('feature gate warn-only by default', gate.warnOnly === true && gate.allowed === true);
  inv = S.invoiceBuilder.createDraft({ tenantId: '__check_tenant__', planId: 'starter' });
  add('invoice draft built', inv && inv.status === 'draft');
  const review = S.invoiceBuilder.markPaidForReview(inv.id, { paymentReference: 'ABC123XYZ' });
  add('mark-paid stays manual review', review.manualReviewRequired === true && review.autoVerified === false);
  doctorOut = S.doctor.run();
  add('doctor runs', !!doctorOut && typeof doctorOut.score === 'number');
} catch (e) { add('functional pipeline', false, e.message); }

// Privacy
add('no secret leak in sample output', !hasLeak(JSON.stringify({ lic, inv, doctorOut })));
add('no full license key returned', lic ? !('licenseKeyHash' in lic) && !('licenseKey' in lic) : false);

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, doctor: doctorOut ? { score: doctorOut.score, status: doctorOut.status, blockers: doctorOut.blockers } : null, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'saas_billing_check.json'), JSON.stringify(out, null, 2));
let md = `# SaaS Billing Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**${doctorOut ? ` · Doctor ${doctorOut.score}/100 (${doctorOut.status})` : ''}\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${c.detail} |\n`; });
fs.writeFileSync(path.join(dir, 'saas_billing_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
