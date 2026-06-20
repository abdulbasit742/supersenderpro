#!/usr/bin/env node
// tests/smoke/publicFunnelSmoke.js — end-to-end smoke for the public funnel.
// Does NOT call external APIs, send WhatsApp/email, create tenants, or capture payments.
// Verifies masking, scoring, requests, previews, consent gating and leak-safety.

const fs = require('fs');
const path = require('path');

const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail: detail || '' }); }

function run() {
  const F = require('../../lib/publicSaasFunnel');

  // 1. config/store + lead store require
  check('funnel_config_loads', !!F.funnelConfig.get());
  check('lead_store_present', typeof F.leadStore.create === 'function');

  // 2. create sample lead with raw PII
  const created = F.leadStore.create({
    name: 'Ali Khan', businessName: 'Khan Store', businessType: 'ecommerce',
    email: 'ali.khan@example.com', phone: '+92 300 1234567', country: 'PK', city: 'Lahore',
    interestedPlan: 'growth', interestedModules: ['whatsapp_crm', 'customer_360', 'ai_agents'],
    message: 'Need this ASAP for my store', consentContact: true, consentMarketing: true,
  }, 'smoke');
  check('lead_created', created.ok && created.lead && created.lead.id);
  const lead = created.lead;

  // 3. masking — raw values must NOT appear anywhere on the stored lead
  const serialized = JSON.stringify(lead);
  check('email_masked', !serialized.includes('ali.khan@example.com'));
  check('phone_masked', !serialized.includes('3001234567') && !serialized.includes('1234567'));
  check('name_masked', !serialized.includes('Ali Khan'));

  // 4. scoring
  check('lead_scored', typeof lead.score === 'number' && !!lead.grade);

  // 5. demo request — no real calendar event
  const demo = F.demoRequests.create({ leadId: lead.id, businessType: 'ecommerce', preferredDate: '2025-01-01' });
  check('demo_request_created', demo.ok && demo.demoRequest.id);
  check('demo_no_real_event', demo.ok && demo.demoRequest.schedulePacket.realEventCreated === false);

  // 6. trial request — preview only, no live tenant/subscription
  const trial = F.trialRequests.create({ leadId: lead.id, requestedPlan: 'pro', businessType: 'ecommerce' });
  check('trial_request_created', trial.ok && trial.trialRequest.id);
  check('trial_no_real_tenant', trial.ok && trial.trialRequest.tenantProvisionDryRun.realTenantCreated === false);
  check('trial_no_payment', trial.ok && trial.trialRequest.billingDraft.capturePayment === false && trial.trialRequest.billingDraft.createSubscription === false);

  // 7. onboarding preview — no live tenant/messages
  const onb = F.onboardingPreview.build({ businessType: 'ecommerce', goal: 'more sales', modules: ['whatsapp_crm'], planInterest: 'growth' });
  check('onboarding_preview_created', onb.liveTenantCreated === false && onb.liveMessagesSent === false);

  // 8. follow-up draft — never sent
  const draft = F.leadFollowupDrafts.generate(lead, 'whatsapp');
  check('followup_draft_not_sent', draft.send === false);

  // 9. consent gating — a no-consent lead must be blocked from marketing drafts
  const noConsent = { id: 'lead_test_nc', businessType: 'ecommerce', consentContact: false, consentMarketing: false };
  const blocked = F.leadFollowupDrafts.generate(noConsent, 'whatsapp');
  check('consent_required_blocks_marketing', F.config.requireConsent ? blocked.blocked === true && blocked.send === false : true);

  // 10. dryRun true by default
  check('dry_run_true', F.config.dryRun === true);

  // 11. no leaks in route-shaped responses
  const pub = F.privacyGuard.publicLeadView(lead);
  check('public_view_no_leak', !F.privacyGuard.hasLeak(pub));
  const adminView = F.privacyGuard.adminLeadView(lead);
  check('admin_view_no_raw_pii', !adminView.emailMasked.includes('ali.khan@example.com'));

  // 12. route module requireable
  let routeOk = false;
  try { require('../../routes/publicSaasFunnelRoutes'); routeOk = true; } catch (e) { routeOk = e.message; }
  check('route_module_requireable', routeOk === true, routeOk === true ? '' : String(routeOk));

  // write artifacts
  const passed = results.filter((r) => r.ok).length;
  const out = { ok: results.every((r) => r.ok), passed, total: results.length, results, generatedAt: new Date().toISOString() };
  const dir = path.join(__dirname, '..', '..', 'artifacts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'public_funnel_smoke.json'), JSON.stringify(out, null, 2));
  const md = ['# Public SaaS Funnel — Smoke Test', '', `Generated: ${out.generatedAt}`, `Result: ${out.ok ? '✅ PASS' : '❌ FAIL'} (${passed}/${results.length})`, '', '| Test | Status | Detail |', '|---|---|---|'];
  for (const r of results) md.push(`| ${r.name} | ${r.ok ? '✅' : '❌'} | ${(r.detail || '').slice(0, 120)} |`);
  fs.writeFileSync(path.join(dir, 'public_funnel_smoke.md'), md.join('\n'));

  console.log(`[public-funnel:smoke] ${out.ok ? 'PASS' : 'FAIL'} ${passed}/${results.length}`);
  if (!out.ok) {
    console.log('[public-funnel:smoke] failed:', results.filter((r) => !r.ok).map((r) => r.name).join(', '));
    process.exitCode = 1;
  }
}

run();
