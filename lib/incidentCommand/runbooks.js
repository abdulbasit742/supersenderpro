'use strict';


/**
* Incident Command — runbook library. Pure data + lookup. No I/O.
* Auto-fix is dry-run suggestion only; nothing here executes.
*/

function rb(id, title, severity, symptoms, likelyCauses, safeChecks, manualFixSteps, dryRunAutoFixAvailable, relatedDocs)
{
 return { id: id, title: title, severity: severity, symptoms: symptoms, likelyCauses: likelyCauses, safeChecks:
safeChecks, manualFixSteps: manualFixSteps, dryRunAutoFixAvailable: !!dryRunAutoFixAvailable, relatedDocs: relatedDocs ||
[] };
}


const RUNBOOKS = [
 rb('whatsapp_session_disconnected', 'WhatsApp QR/session disconnected', 'high',
   ['Messages not sending', 'QR prompt repeating', 'Worker offline'],
     ['Session expired', 'Worker bridge offline', 'Phone unlinked'],
     ['Check worker heartbeat status', 'Check Cloud API config inspector'],
     ['Re-scan QR on the local worker', 'Restart local worker', 'Verify Cloud API token if using Cloud lane'], false,
     ['docs/WHATSAPP_CLOUD_SETUP_WIZARD.md', 'docs/LOCAL_WORKER_BRIDGE.md']),
 rb('channel_publishing_failed', 'Channel publishing failed', 'medium',
   ['Channel posts not delivered', 'Fallback warnings'],
     ['Channel not supported by transport', 'Worker offline', 'Rate limit'],
     ['Check channel adapter status', 'Check newsletter fallback'],
   ['Use newsletter fallback', 'Retry after cooldown'], false, []),
 rb('social_token_missing', 'Social token missing', 'low',
     ['Social drafts cannot publish'], ['No provider token in .env'],
     ['Check social adapter health'], ['Add FACEBOOK/INSTAGRAM/LINKEDIN token to .env (never commit)'], false, []),
 rb('ecommerce_provider_missing', 'Ecommerce provider missing', 'medium',
   ['Orders/products not syncing'], ['Provider not configured', 'Catalog store missing'],
   ['Check ecommerce adapter health'], ['Configure Shopify/local provider', 'Verify catalog store path'], false, []),
 rb('payment_verification_stuck', 'Payment verification stuck', 'high',
     ['Payments pending forever'], ['Validator queue stuck', 'Reference duplicate window'],
     ['Check payment validation store status'], ['Inspect validator history', 'Confirm DRY_RUN expected'], false,
['docs/']),
 rb('saas_tenant_past_due', 'SaaS tenant past due warning', 'medium',
     ['Tenant flagged past due'], ['Billing cycle lapsed'],
     ['Check billing adapter health'], ['Notify tenant (draft)', 'Confirm enforcement is auth-gated'], false, []),
 rb('voice_ai_provider_missing', 'Voice AI provider missing', 'medium',
   ['Voice replies fail'], ['No provider key', 'Clone without consent'],
   ['Check voice adapter health'], ['Add provider key', 'Confirm consent flag before clone'], false, []),
 rb('ai_provider_key_missing', 'AI provider API key missing', 'medium',
     ['AI agent replies fail'], ['No OPENAI/ANTHROPIC key and no local KB'],
     ['Check AI agents adapter health'], ['Set a provider key or enable local KB'], false, []),
 rb('queue_stuck', 'Queue stuck', 'high',
   ['Jobs not draining', 'Repeated failures'], ['Worker down', 'Poison message'],

     ['Check queue depth + stuck count'], ['Pause intake', 'Requeue or drop poison job (manual)'], false, []),
    rb('backup_restore_blocked', 'Backup restore blocked', 'high',
      ['Restore refuses to run'], ['Restore-write disabled (by design)', 'Checksum mismatch'],
   ['Check backup adapter health'], ['Verify backup integrity', 'Enable restore-write only during a real restore'],
false, []),
    rb('security_scan_warning', 'Security scan warning', 'medium',
      ['Findings in last security report'], ['Secret-like string', 'Dangerous file staged'],
      ['Read artifacts/security_report.md'], ['Rotate any exposed secret', 'Unstage risky files'], false, ['docs/']),
    rb('launch_readiness_blocked', 'Launch readiness blocked', 'high',
     ['Launch score < 70'], ['Missing env/routes/docs/tests'],
     ['Read artifacts/launch_report.md'], ['Resolve listed blockers, re-run launch-check'], false,
['docs/LAUNCH_CHECKLIST.md']),
 rb('route_not_mounted', 'Route not mounted', 'medium',
     ['404 on a feature API'], ['Hook not added to server.js'],
     ['Grep server.js for the route require'], ['Add the BEGIN/END HOOK mount block'], false, []),
    rb('dashboard_page_missing', 'Dashboard page missing', 'low',
      ['Nav link 404s'], ['HTML page not created', 'Link not added'],
      ['Check public/ for the page'], ['Add the page + nav hook'], false, []),
    rb('env_placeholder_missing', 'Env placeholder missing', 'low',
     ['Feature uses defaults / disabled'], ['.env.example not updated'],
     ['Diff .env.example against feature env list'], ['Add placeholders (never real secrets)'], false, []),
    rb('live_action_enabled', 'Live action accidentally enabled', 'critical',
      ['A live/destructive flag is true'], ['Env flag flipped without approval'],
   ['Check the specific *_LIVE / *_AUTO flag'], ['Set the flag back to false', 'Confirm approval guard exists'], false,
['docs/INCIDENT_SAFETY.md']),
    rb('customer_360_privacy_warning', 'Customer 360 privacy warning', 'high',
      ['PII visible in export/log'], ['Masking not applied'],
      ['Check customer 360 adapter notes'], ['Apply phone/email masking on exports'], false, []),
    rb('flow_studio_trigger_missing', 'Flow Studio trigger missing', 'low',
     ['Flow never fires'], ['Trigger node not registered'],
     ['Check Flow Studio adapter health'], ['Register the trigger node'], false, []),
];


function list() { return RUNBOOKS.slice(); }
function get(id) { return RUNBOOKS.find(function (r) { return r.id === id; }) || null; }

module.exports = { RUNBOOKS, list, get };
