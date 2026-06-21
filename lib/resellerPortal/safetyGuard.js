'use strict';
/** Central gate. Payouts, tenant writes, custom domains, white-label, live messages off by default. */
function globalDryRun() { return String(process.env.RESELLER_PORTAL_DRY_RUN || 'true') !== 'false'; }
function allowWhiteLabel() { return String(process.env.RESELLER_PORTAL_ALLOW_WHITE_LABEL || 'false') === 'true'; }
function allowCustomDomain() { return String(process.env.RESELLER_PORTAL_ALLOW_CUSTOM_DOMAIN || 'false') === 'true'; }
function allowRealPayouts() { return String(process.env.RESELLER_PORTAL_ALLOW_REAL_PAYOUTS || 'false') === 'true'; }
function allowLiveMessages() { return String(process.env.RESELLER_PORTAL_ALLOW_LIVE_MESSAGES || 'false') === 'true'; }
function requireConsent() { return String(process.env.RESELLER_PORTAL_REQUIRE_CONSENT || 'true') !== 'false'; }
const FORBIDDEN = ['real_payout', 'live_tenant_create', 'configure_dns', 'issue_ssl', 'send_live_message',
'cold_outreach'];
function check(action, ctx) {

  const c = ctx || {};
  const blockedReasons = [];
  if (FORBIDDEN.includes(action)) blockedReasons.push('forbidden_action');
  if (action === 'payout' && !allowRealPayouts()) blockedReasons.push('payouts_disabled');
  if (action === 'white_label' && !allowWhiteLabel()) blockedReasons.push('white_label_disabled');
  if (action === 'custom_domain' && !allowCustomDomain()) blockedReasons.push('custom_domain_disabled');
  if (action === 'send_message' && !allowLiveMessages()) blockedReasons.push('live_messages_disabled');
  if (requireConsent() && c.consentOk === false) blockedReasons.push('consent_missing');
  return { allowed: blockedReasons.length === 0 && !globalDryRun(), dryRun: globalDryRun(), blocked:
blockedReasons.length > 0, blockedReasons };
}
module.exports = { check, globalDryRun, allowWhiteLabel, allowCustomDomain, allowRealPayouts, allowLiveMessages,
requireConsent, FORBIDDEN };
