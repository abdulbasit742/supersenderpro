'use strict';


/**
 * Reseller Portal QA — partner onboarding checklist. Builds a checklist by probing
    * the existing portal modules + env. Read-only; returns items, never mutates.
    */


const guard = require('./qaGuard');

const ITEM_STATUSES = ['missing', 'configured', 'warning', 'blocked', 'skipped', 'verified'];


function item(section, title, status, required, opts) {
     const o = opts || {};
     return {
       id: section, section: section, title: title,
       status: ITEM_STATUSES.indexOf(status) !== -1 ? status : 'missing',
       required: !!required, blocker: status === 'blocked', warning: status === 'warning',
       fixSteps: o.fixSteps || [], linkedDoc: o.linkedDoc || null, updatedAt: new Date().toISOString(),
     };
}


function build() {
     const registry = guard.loadPortal('resellerRegistry');
     const whiteLabel = guard.loadPortal('whiteLabelSettings');
     const referrals = guard.loadPortal('referralTracker');
     const commission = guard.loadPortal('commissionPreview');
     const assets = guard.loadPortal('assetLibrary');
     const safety = guard.loadPortal('safetyGuard');


     const partnersPage = guard.exists('public/partners.html');
     const demoExists = guard.exists('public/demo-sandbox.html') || guard.exists('public/demo.html');
     const funnelExists = guard.exists('public/funnel.html') || guard.exists('public/pricing.html');

     const payoutDisabled = safety && typeof safety.allowRealPayouts === 'function' ? safety.allowRealPayouts() === false :
guard.boolEnv('RESELLER_PORTAL_ALLOW_REAL_PAYOUTS', false) === false;
  const liveMsgDisabled = safety && typeof safety.allowLiveMessages === 'function' ? safety.allowLiveMessages() === false
: guard.boolEnv('RESELLER_PORTAL_ALLOW_LIVE_MESSAGES', false) === false;

    return [
      item('reseller_profile', 'Reseller profile complete', registry ? 'configured' : 'missing', true, { fixSteps: ['Create a reseller via the portal registry.'], linkedDoc: 'docs/RESELLER_PORTAL_COMMAND_CENTER.md' }),
    item('partner_tier', 'Partner tier selected', registry ? 'configured' : 'missing', true),
    item('contact_masked', 'Contact details masked', guard.loadPortal('privacyGuard') ? 'verified' : 'warning', true, {
linkedDoc: 'docs/RESELLER_PRIVACY_ISOLATION.md' }),
    item('referral_code', 'Referral code generated', referrals ? 'configured' : 'missing', true, { linkedDoc:
'docs/REFERRAL_LINK_QA.md' }),
      item('public_partner_page', 'Public partner page available', partnersPage ? 'configured' : 'missing', true),
      item('demo_link', 'Demo sandbox link available', demoExists ? 'configured' : 'warning', false),
      item('funnel_link', 'Public funnel link available', funnelExists ? 'configured' : 'warning', false),
      item('white_label', 'White-label settings reviewed', whiteLabel ? 'configured' : 'missing', false, { linkedDoc:
'docs/WHITE_LABEL_QA.md' }),
    item('commission_preview', 'Commission preview configured', commission ? 'configured' : 'missing', true, { linkedDoc:
'docs/COMMISSION_PREVIEW_QA.md' }),
    item('partner_assets', 'Partner assets available', assets ? 'configured' : 'missing', false),
    item('support_process', 'Support process documented', guard.exists('docs/PARTNER_LAUNCH_CHECKLIST.md') ? 'configured'
: 'warning', false),
    item('tenant_privacy', 'Tenant/client privacy checked', guard.requirePrivacy() ? 'verified' : 'warning', true, {
linkedDoc: 'docs/RESELLER_PRIVACY_ISOLATION.md' }),
      item('compliance_consent', 'Compliance consent checked', guard.requireConsent() ? 'verified' : 'warning', true),
      item('payout_disabled', 'Payout disabled by default', payoutDisabled ? 'verified' : 'blocked', true, { fixSteps:
['Set RESELLER_PORTAL_ALLOW_REAL_PAYOUTS=false.'] }),
    item('live_messages_disabled', 'Live messages disabled by default', liveMsgDisabled ? 'verified' : 'blocked', true, {
fixSteps: ['Set RESELLER_PORTAL_ALLOW_LIVE_MESSAGES=false.'] }),
  ];
}


module.exports = { ITEM_STATUSES, build };
