 'use strict';

 /**
     * Reseller Portal QA — readiness doctor. Aggregates every QA module + wiring checks
     * into a single score + launch-readiness status. Read-only.
     */


 const guard = require('./qaGuard');
 const onboardingDoctor = require('./onboardingDoctor');
 const brandingQA = require('./brandingQA');
 const domainQA = require('./domainQA');
 const referralQA = require('./referralQA');
 const commissionQA = require('./commissionQA');
 const tenantPrivacyQA = require('./tenantPrivacyQA');
 const clientPreviewQA = require('./clientPreviewQA');
 const publicPartnerPageQA = require('./publicPartnerPageQA');
 const assetQA = require('./assetQA');

 function wiringChecks() {
      const checks = [];
      function add(name, ok, blocker) { checks.push({ name: name, ok: !!ok, blocker: !!blocker }); }
      const server = guard.read('server.js');
      add('reseller portal route mounted', /\/api\/reseller-portal\b/.test(server), false);
      add('reseller QA route mounted', /reseller-portal-qa/.test(server), false);
      add('dashboard page (portal) exists', guard.exists('public/reseller-portal.html'), false);
      add('QA dashboard page exists', guard.exists('public/reseller-portal-qa.html'), false);
      add('public partner page exists', guard.exists('public/partners.html'), true);
      add('env placeholders present', /RESELLER_PORTAL_QA_DRY_RUN/.test(guard.read('.env.example')), false);
      add('QA docs present', guard.exists('docs/RESELLER_PORTAL_QA.md'), false);
      add('QA smoke present', guard.exists('tests/smoke/resellerPortalQASmoke.js'), false);
      return checks;
 }

 function run() {
   const onboarding = onboardingDoctor.run();
      const branding = brandingQA.run('qa_sample');
      const domain = domainQA.run();
      const referral = referralQA.run('qa_sample');
      const commission = commissionQA.run('qa_sample');
      const privacy = tenantPrivacyQA.run('qa_sample');
      const clientShape = clientPreviewQA.run('qa_sample');
      const publicPage = publicPartnerPageQA.run();
      const assets = assetQA.run();
      const wiring = wiringChecks();

      const blockers = [];
      const warnings = [];

function collect(label, r) {
  (r.blockers || []).forEach(function (b) { blockers.push(label + ': ' + b); });
  (r.warnings || []).forEach(function (w) { warnings.push(label + ': ' + w); });
}
collect('onboarding', { blockers: onboarding.blockers, warnings: onboarding.warnings });
collect('branding', branding); collect('domain', domain); collect('referral', referral);
collect('commission', commission); collect('privacy', privacy); collect('clientShape', clientShape);
collect('publicPage', publicPage); collect('assets', assets);
wiring.filter(function (c) { return !c.ok && c.blocker; }).forEach(function (c) { blockers.push('wiring: ' + c.name + ' missing'); });
wiring.filter(function (c) { return !c.ok && !c.blocker; }).forEach(function (c) { warnings.push('wiring: ' + c.name +
' missing'); });

// Hard safety gates (policy).
if (guard.requirePayoutDisabled() && !commission.payoutDisabled) blockers.push('policy: real payouts must be disabled');
const liveMsgDisabled = guard.boolEnv('RESELLER_PORTAL_ALLOW_LIVE_MESSAGES', false) === false;
if (guard.requireLiveMessagesDisabled() && !liveMsgDisabled) blockers.push('policy: live messages must be disabled');
const customDomainOff = guard.boolEnv('RESELLER_PORTAL_ALLOW_CUSTOM_DOMAIN', false) === false;
if (!customDomainOff) blockers.push('policy: custom domains must be disabled unless explicitly enabled');

// Score: weighted across sections (each verified = full marks, warning = half, blocked = 0).
const sections = [
  sectionScore(onboarding.score), pass(branding), pass(domain), pass(referral),
  pass(commission), pass(privacy), pass(clientShape), pass(publicPage), pass(assets),
];
const wiringScore = Math.round((wiring.filter(function (c) { return c.ok; }).length / wiring.length) * 100);
const avg = Math.round((sections.reduce(function (a, b) { return a + b; }, 0) + wiringScore) / (sections.length + 1));
const score = Math.max(0, Math.min(100, avg));


// Readiness tiers.
const noBlockers = blockers.length === 0;
const readyForInternalDemo = score >= 50;
const readyForPartnerPreview = score >= 65 && privacy.privacySafe !== false;
const readyForPilotPartner = score >= 80 && noBlockers && commission.payoutDisabled;
const readyForPublicPartnerLaunch = score >= 90 && noBlockers && privacy.isolated !== false &&
commission.payoutDisabled && customDomainOff;


let status = 'blocked';
if (readyForPublicPartnerLaunch) status = 'public_partner_launch_ready_with_caution';
else if (readyForPilotPartner) status = 'pilot_partner_ready';
else if (readyForPartnerPreview) status = 'partner_preview_ready';
else if (readyForInternalDemo && noBlockers) status = 'internal_demo_ready';


const nextSteps = blockers.slice(0, 8).concat(onboarding.nextSteps || []).slice(0, 10);

return {
  dryRun: true, score: score, status: status,
  blockers: blockers, warnings: warnings,
  readyForInternalDemo: readyForInternalDemo,
  readyForPartnerPreview: readyForPartnerPreview,
  readyForPilotPartner: readyForPilotPartner,
  readyForPublicPartnerLaunch: readyForPublicPartnerLaunch,
  sections: { onboarding: onboarding, branding: branding, domain: domain, referral: referral, commission: commission,
privacy: privacy, clientShape: clientShape, publicPage: publicPage, assets: assets, wiring: wiring },
  nextSteps: nextSteps,
};

}


function pass(r) { if (!r) return 0; if (r.status === 'verified' || r.ok === true) return 100; if (r.status ===
'warning') return 50; if (r.status === 'unavailable') return 40; return 0; }
function sectionScore(n) { return Math.max(0, Math.min(100, Number(n) || 0)); }

module.exports = { run, wiringChecks };
