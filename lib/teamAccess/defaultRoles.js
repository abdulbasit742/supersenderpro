// lib/teamAccess/defaultRoles.js — Default roles + their granted permission keys.
// Live send/publish/billing/tenant/security/feature-rollout are gated even when granted (approval-required).
'use strict';
const { KEYS }=require('./defaultPermissions');
const all=()=>KEYS.slice();
const ROLES=[
  { id:'owner', label:'Owner', readOnly:false, permissions:all() },
  { id:'admin', label:'Admin', readOnly:false, permissions:all().filter(k=>k!=='billing.manage'&&k!=='tenant.manage') },
  { id:'operations_manager', label:'Operations Manager', readOnly:false, permissions:[
    'dashboard.view','customer360.view','customer360.manage','whatsapp.draft','whatsapp.approve','channel.draft','channel.approve',
    'growth_campaign.view','growth_campaign.manage','support.view','support.reply_draft','support.resolve','pilot_ops.view',
    'template.view','template.install_preview','approval.view','approval.decide','settings.view','deployment.view'] },
  { id:'sales_agent', label:'Sales Agent', readOnly:false, permissions:[
    'dashboard.view','customer360.view','whatsapp.draft','channel.draft','growth_campaign.view','support.view','support.reply_draft','template.view'] },
  { id:'support_agent', label:'Support Agent', readOnly:false, permissions:[
    'dashboard.view','customer360.view','support.view','support.reply_draft','support.resolve','whatsapp.draft','template.view'] },
  { id:'marketing_manager', label:'Marketing Manager', readOnly:false, permissions:[
    'dashboard.view','customer360.view','whatsapp.draft','whatsapp.approve','channel.draft','channel.approve',
    'growth_campaign.view','growth_campaign.manage','template.view','template.install_preview','approval.view'] },
  { id:'ecommerce_manager', label:'Ecommerce Manager', readOnly:false, permissions:[
    'dashboard.view','customer360.view','customer360.manage','growth_campaign.view','growth_campaign.manage','template.view','template.install_preview','support.view'] },
  { id:'billing_manager', label:'Billing Manager', readOnly:false, permissions:[
    'dashboard.view','billing.view','billing.preview','billing.manage','tenant.view','approval.view','settings.view'] },
  { id:'compliance_reviewer', label:'Compliance Reviewer', readOnly:false, permissions:[
    'dashboard.view','audit.view','audit.export_redacted','approval.view','approval.decide','security.view','tenant.view'] },
  { id:'developer', label:'Developer', readOnly:false, permissions:[
    'dashboard.view','developer_portal.view','developer_portal.manage_preview','feature_flags.view','feature_flags.rollout_preview','deployment.view','deployment.check','settings.view'] },
  { id:'reseller_owner', label:'Reseller Owner', readOnly:false, permissions:[
    'dashboard.view','reseller.view','reseller.manage','customer360.view','billing.view','billing.preview','template.view','approval.view','tenant.view'] },
  { id:'reseller_staff', label:'Reseller Staff', readOnly:false, permissions:[
    'dashboard.view','reseller.view','customer360.view','support.view','support.reply_draft','template.view'] },
  { id:'viewer', label:'Viewer (read-only)', readOnly:true, permissions:[
    'dashboard.view','customer360.view','growth_campaign.view','support.view','reseller.view','billing.view','tenant.view',
    'template.view','approval.view','audit.view','developer_portal.view','security.view','feature_flags.view','deployment.view','settings.view'] },
  { id:'custom', label:'Custom', readOnly:false, permissions:['dashboard.view'] },
];
const IDS=ROLES.map(r=>r.id);
function get(id){ return ROLES.find(r=>r.id===id)||null; }
module.exports={ ROLES, IDS, get };
