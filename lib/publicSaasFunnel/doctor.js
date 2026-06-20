// lib/publicSaasFunnel/doctor.js
// Self-diagnostic for the public funnel. Returns a structured pass/fail report.
// Read-only checks; creates no live data, sends nothing.

const fs = require('fs');
const path = require('path');
const { config, REPO_ROOT } = require('./store');

function fileExists(rel) { return fs.existsSync(path.join(REPO_ROOT, rel)); }

function run() {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail || '' });

  // Pages
  add('landing_page_exists', fileExists('public/landing.html'));
  add('features_page_exists', fileExists('public/features.html'));
  add('pricing_page_exists', fileExists('public/pricing.html'));
  add('use_cases_page_exists', fileExists('public/use-cases.html'));
  add('start_page_exists', fileExists('public/start.html'));
  add('leads_admin_page_exists', fileExists('public/leads.html'));

  // Route module
  let routeRequireable = false;
  try { require('../../routes/publicSaasFunnelRoutes'); routeRequireable = true; } catch (e) { routeRequireable = e.message; }
  add('route_module_requireable', routeRequireable === true, routeRequireable === true ? '' : String(routeRequireable));

  // server.js hook
  let serverHook = false;
  try { serverHook = fs.readFileSync(path.join(REPO_ROOT, 'server.js'), 'utf8').includes('PUBLIC SAAS FUNNEL HOOK'); } catch { serverHook = false; }
  add('server_hook_present', serverHook);

  // Env placeholders
  let envOk = false;
  try { envOk = fs.readFileSync(path.join(REPO_ROOT, '.env.example'), 'utf8').includes('PUBLIC_FUNNEL_ENABLED'); } catch { envOk = false; }
  add('env_placeholders_present', envOk);

  // Docs
  add('docs_present', fileExists('docs/PUBLIC_SAAS_FUNNEL.md'));

  // Functional checks (in-memory, no persistence side effects beyond temp store)
  try {
    const leadStore = require('./leadStore');
    const r = leadStore.create({ name: 'Doctor Test', email: 'doc@example.com', phone: '+923001234567', businessType: 'ecommerce', consentContact: true }, 'doctor');
    add('lead_store_works', r.ok && !!r.lead.id);
    add('lead_pii_masked', r.ok && !String(r.lead.emailMasked).includes('doc@example.com') && !String(r.lead.phoneMasked).includes('1234567'));
    if (r.ok) {
      const demo = require('./demoRequests').create({ leadId: r.lead.id, businessType: 'ecommerce' });
      add('demo_request_works', demo.ok && demo.demoRequest.schedulePacket.realEventCreated === false);
      const trial = require('./trialRequests').create({ leadId: r.lead.id, requestedPlan: 'growth' });
      add('trial_request_works', trial.ok && trial.trialRequest.tenantProvisionDryRun.realTenantCreated === false);
      const onb = require('./onboardingPreview').build({ businessType: 'ecommerce', goal: 'more sales' });
      add('onboarding_preview_works', onb.liveTenantCreated === false);
    }
  } catch (e) {
    add('functional_checks', false, e.message);
  }

  // Safety posture
  add('consent_required', config.requireConsent === true || config.strict === false);
  add('no_raw_lead_export_default', config.exportRawLeads === false);
  add('no_live_whatsapp_default', config.allowLiveWhatsapp === false);
  add('no_live_email_default', config.allowLiveEmail === false);
  add('no_tenant_write_default', config.allowTenantWrite === false);
  add('dry_run_default', config.dryRun === true);

  // Adapter status
  const adapters = {
    saasBilling: require('./adapters/saasBillingAdapter').present,
    businessSetup: require('./adapters/businessSetupAdapter').present,
    customer360: require('./adapters/customer360Adapter').present,
    compliance: require('./complianceAdapter').present,
    kpiCommand: require('./adapters/kpiCommandAdapter').present,
    growthCampaign: require('./adapters/growthCampaignAdapter').present,
  };

  const passed = checks.filter((c) => c.ok).length;
  return {
    ok: checks.every((c) => c.ok),
    total: checks.length,
    passed,
    failed: checks.length - passed,
    checks,
    adapters,
    safety: require('./safetyGuard').safetyStatus(),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { run };
