'use strict';
/** Central gate. Live replies + external AI off by default. */
function globalDryRun() { return String(process.env.SUPPORT_HELPDESK_DRY_RUN || 'true') !== 'false'; }
function allowLiveReplies() { return String(process.env.SUPPORT_HELPDESK_ALLOW_LIVE_REPLIES || 'false') === 'true'; }
function aiLive() { return String(process.env.SUPPORT_HELPDESK_AI_LIVE || 'false') === 'true'; }
function requireConsent() { return String(process.env.SUPPORT_HELPDESK_REQUIRE_CONSENT || 'true') !== 'false'; }
const FORBIDDEN = ['send_live_reply', 'send_email', 'send_whatsapp', 'external_ai_no_consent'];

function check(action, ctx) {
  const c = ctx || {};
  const blockedReasons = [];
  if (action === 'send_reply' && !allowLiveReplies()) blockedReasons.push('live_replies_disabled');
  if (action === 'external_ai' && !aiLive()) blockedReasons.push('external_ai_disabled');
  if (requireConsent() && c.consentOk === false) blockedReasons.push('consent_missing');
  if (FORBIDDEN.includes(action)) blockedReasons.push('forbidden_action');
  return { allowed: blockedReasons.length === 0 && !globalDryRun(), dryRun: globalDryRun(), blocked:
blockedReasons.length > 0, blockedReasons };
}
module.exports = { check, globalDryRun, allowLiveReplies, aiLive, requireConsent, FORBIDDEN };
