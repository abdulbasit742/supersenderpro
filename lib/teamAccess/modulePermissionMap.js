// lib/teamAccess/modulePermissionMap.js — Maps risky action types to required permissions + module ids.
'use strict';
const MAP={
  whatsapp_live_send:{ permission:'whatsapp.live_send', moduleId:'whatsapp', risky:true },
  channel_live_publish:{ permission:'channel.live_publish', moduleId:'channelAutomation', risky:true },
  payment_verification:{ permission:'billing.manage', moduleId:'saasBilling', risky:true },
  billing_activation:{ permission:'billing.manage', moduleId:'saasBilling', risky:true },
  tenant_create_update:{ permission:'tenant.manage', moduleId:'tenantPortal', risky:true },
  feature_rollout_write:{ permission:'feature_flags.rollout_preview', moduleId:'featureFlags', risky:true },
  security_policy_enforce:{ permission:'security.manage_policy_preview', moduleId:'securityGateway', risky:true },
  deployment_action:{ permission:'deployment.check', moduleId:'deployment', risky:true },
  raw_export:{ permission:'audit.export_redacted', moduleId:'auditLedger', risky:true },
  webhook_live_delivery:{ permission:'developer_portal.manage_preview', moduleId:'developerPortal', risky:true },
  api_key_creation:{ permission:'developer_portal.manage_preview', moduleId:'developerPortal', risky:true },
  support_message_send:{ permission:'support.resolve', moduleId:'supportHelpdesk', risky:true },
  template_live_install:{ permission:'template.install_preview', moduleId:'templateMarketplace', risky:true },
};
function get(actionType){ return MAP[actionType]||null; }
function actions(){ return Object.keys(MAP); }
module.exports={ MAP, get, actions };
