// lib/featureFlags/killSwitchPlanner.js — Plans an emergency kill switch (preview by default).
'use strict';
const registry=require('./featureRegistry');
const { guardKill }=require('./safetyGuard');
const TRIGGERS=['security_risk','compliance_risk','payment_billing_risk','tenant_data_leak_risk','webhook_abuse',
  'external_api_failure','whatsapp_ban_risk','high_error_rate','admin_manual'];
function plan(featureKey, reason='admin_manual'){
  const flag=registry.get(featureKey);
  if(!flag) return { ok:false, error:'unknown_feature', featureKey };
  const guard=guardKill('kill_switch');
  const validReason=TRIGGERS.includes(reason)?reason:'admin_manual';
  return { ok:true, plan:{ featureKey, moduleId:flag.moduleId, reason:validReason, fromStatus:flag.status, toStatus:'killed',
    impactPreview:`Module '${flag.moduleId}' feature '${flag.key}' would be disabled immediately (preview).`,
    rollbackNote:`To restore: set rolloutMode back to '${flag.rolloutMode}' and status to '${flag.status}' after review.`,
    approvalRequired:true, auditRequired:true, dryRun:true, mode:guard.mode, plannedAt:new Date().toISOString() } };
}
module.exports={ plan, TRIGGERS };
