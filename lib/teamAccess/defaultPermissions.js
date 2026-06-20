// lib/teamAccess/defaultPermissions.js — Canonical permission groups for Team Access.
// "risky" permissions are live/destructive and must be approval-required / disabled by default.
'use strict';
const PERMISSIONS=[
  { key:'dashboard.view', label:'View dashboard', risky:false },
  { key:'owner_command.view', label:'View Owner Command', risky:false },
  { key:'owner_command.manage', label:'Manage Owner Command', risky:true },
  { key:'customer360.view', label:'View Customer 360', risky:false },
  { key:'customer360.manage', label:'Manage Customer 360', risky:true },
  { key:'whatsapp.draft', label:'Draft WhatsApp message', risky:false },
  { key:'whatsapp.approve', label:'Approve WhatsApp message', risky:true },
  { key:'whatsapp.live_send', label:'Live WhatsApp send', risky:true },
  { key:'channel.draft', label:'Draft channel/social post', risky:false },
  { key:'channel.approve', label:'Approve channel/social post', risky:true },
  { key:'channel.live_publish', label:'Live channel/social publish', risky:true },
  { key:'growth_campaign.view', label:'View growth campaigns', risky:false },
  { key:'growth_campaign.manage', label:'Manage growth campaigns', risky:true },
  { key:'support.view', label:'View support', risky:false },
  { key:'support.reply_draft', label:'Draft support reply', risky:false },
  { key:'support.resolve', label:'Resolve support ticket', risky:true },
  { key:'pilot_ops.view', label:'View Pilot Ops', risky:false },
  { key:'pilot_ops.manage', label:'Manage Pilot Ops', risky:true },
  { key:'reseller.view', label:'View reseller', risky:false },
  { key:'reseller.manage', label:'Manage reseller', risky:true },
  { key:'billing.view', label:'View billing', risky:false },
  { key:'billing.preview', label:'Preview billing change', risky:false },
  { key:'billing.manage', label:'Manage billing (live)', risky:true },
  { key:'tenant.view', label:'View tenant', risky:false },
  { key:'tenant.manage', label:'Manage tenant (live)', risky:true },
  { key:'template.view', label:'View templates', risky:false },
  { key:'template.install_preview', label:'Preview template install', risky:false },
  { key:'approval.view', label:'View approvals', risky:false },
  { key:'approval.decide', label:'Decide approvals', risky:true },
  { key:'audit.view', label:'View audit', risky:false },
  { key:'audit.export_redacted', label:'Export redacted audit', risky:true },
  { key:'developer_portal.view', label:'View Developer Portal', risky:false },
  { key:'developer_portal.manage_preview', label:'Preview Developer Portal manage', risky:true },
  { key:'security.view', label:'View security', risky:false },
  { key:'security.manage_policy_preview', label:'Preview security policy manage', risky:true },
  { key:'feature_flags.view', label:'View feature flags', risky:false },
  { key:'feature_flags.rollout_preview', label:'Preview feature rollout', risky:true },
  { key:'deployment.view', label:'View deployment', risky:false },
  { key:'deployment.check', label:'Run deployment check', risky:false },
  { key:'settings.view', label:'View settings', risky:false },
  { key:'settings.manage_preview', label:'Preview settings manage', risky:true },
];
const KEYS=PERMISSIONS.map(p=>p.key);
const RISKY=PERMISSIONS.filter(p=>p.risky).map(p=>p.key);
function isRisky(key){ return RISKY.includes(key); }
function get(key){ return PERMISSIONS.find(p=>p.key===key)||null; }
module.exports={ PERMISSIONS, KEYS, RISKY, isRisky, get };
