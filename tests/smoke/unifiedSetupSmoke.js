#!/usr/bin/env node
// tests/smoke/unifiedSetupSmoke.js — Offline smoke test for the Unified Setup Wizard.
// No external APIs, no WhatsApp, no live ecommerce/payment/social writes.

const fs = require('fs');
const path = require('path');
const results = [];
function check(name, fn) { try { results.push({ name, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let U;
check('require route module', () => { require('../../routes/unifiedSetupRoutes'); return 'loaded'; });
check('require barrel', () => { U = require('../../lib/unifiedSetup'); assert(U.stepEngine && U.readinessReport && U.credentialChecklist, 'missing core'); return 'ok'; });

let profile;
check('create sample business profile', () => {
  profile = U.businessProfile.upsert({ businessName: 'Smoke Co', businessType: 'ecommerce_store',
    ownerPhone: '+92 311 9876543', ownerEmail: 'boss@smoke.com' });
  assert(profile.businessType === 'ecommerce_store', 'type not set');
  return profile.businessId;
});
check('owner phone/email masked, raw removed', () => {
  assert(profile.ownerPhone === undefined && profile.ownerEmail === undefined, 'raw owner contact stored!');
  assert(!/\d{7,}/.test(profile.ownerPhoneMasked), 'phone not masked');
  return `${profile.ownerPhoneMasked} / ${profile.ownerEmailMasked}`;
});

let steps;
check('generate setup steps', () => { steps = U.stepEngine.allSteps(); assert(steps.length >= 20, 'too few steps'); return `${steps.length} steps`; });
check('dry-run flag true by default', () => { assert(U.config.dryRun === true, 'dryRun not true'); return 'dry-run'; });

let checklist;
check('inspect credential checklist', () => {
  checklist = U.credentialChecklist.build();
  assert(checklist.length > 0, 'empty checklist');
  assert(checklist.every((c) => !('value' in c)), 'checklist leaked a value field');
  return `${checklist.length} items`;
});

let plan;
check('generate autopilot plan', () => { plan = U.autopilotPlanner.plan('ecommerce_store'); assert(plan.recommendedPath.length > 0, 'empty plan'); return `${plan.recommendedPath.length} steps`; });

let report;
check('generate readiness score', () => { report = U.readinessReport.build(); assert(typeof report.score === 'number', 'no score'); return `${report.score}/${report.status}`; });

check('generate onboarding tasks', () => { const t = U.onboardingTasks.generate(); assert(t.added >= 0 && Array.isArray(t.tasks), 'tasks failed'); return `${t.tasks.length} tasks`; });

check('connectors never crash on inspection', () => { const m = U.connectors.allStatuses(); assert(m.length === 18, 'expected 18 connectors'); return `${m.length} modules`; });

check('no secrets leak in full output', () => {
  const { hasLeak } = require('../../lib/unifiedSetup/privacy');
  const blob = JSON.stringify({ profile, steps, checklist, plan, report });
  assert(!hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'unified_setup_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Unified Setup Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'unified_setup_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
