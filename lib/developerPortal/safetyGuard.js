// developerPortal/safetyGuard.js — central policy flags. Safe-by-default.
function flag(name, def){ const v=process.env[name]; if(v===undefined) return def; return String(v).toLowerCase()==='true'; }

function policy(){
  return {
    enabled: flag('DEVELOPER_PORTAL_ENABLED', true),
    dryRun: flag('DEVELOPER_PORTAL_DRY_RUN', true),
    allowRealKeys: flag('DEVELOPER_PORTAL_ALLOW_REAL_KEYS', false),
    allowLiveWebhooks: flag('DEVELOPER_PORTAL_ALLOW_LIVE_WEBHOOKS', false),
    requireApprovalForWebhooks: flag('DEVELOPER_PORTAL_REQUIRE_APPROVAL_FOR_WEBHOOKS', true),
    redactPayloads: flag('DEVELOPER_PORTAL_REDACT_PAYLOADS', true),
    publicDocs: flag('DEVELOPER_PORTAL_PUBLIC_DOCS', true),
    strict: flag('DEVELOPER_PORTAL_STRICT', false),
  };
}

// Hard guarantee: live webhooks are only allowed if BOTH dryRun is off AND allowLiveWebhooks is on.
function liveWebhooksAllowed(){ const p=policy(); return p.allowLiveWebhooks===true && p.dryRun===false; }
function realKeysAllowed(){ return policy().allowRealKeys===true; }

module.exports = { policy, liveWebhooksAllowed, realKeysAllowed };
