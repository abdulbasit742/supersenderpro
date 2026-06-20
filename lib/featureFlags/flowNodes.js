// lib/featureFlags/flowNodes.js — Flow Studio trigger/action registry entries (no live execution).
// Registered only as metadata; actual execution is owned by Flow Studio if present.
'use strict';
const TRIGGERS=[
  { id:'feature_flags.flag_changed_preview', label:'Feature flag changed (preview)' },
  { id:'feature_flags.rollout_planned', label:'Rollout planned' },
  { id:'feature_flags.kill_switch_previewed', label:'Kill switch previewed' },
  { id:'feature_flags.access_blocked', label:'Feature access blocked' },
  { id:'feature_flags.high_risk_rollout_requested', label:'High-risk rollout requested' },
];
const ACTIONS=[
  { id:'evaluate_feature_flag', label:'Evaluate feature flag', live:false },
  { id:'create_rollout_preview', label:'Create rollout preview', live:false },
  { id:'create_kill_switch_preview', label:'Create kill switch preview', live:false },
  { id:'create_feature_access_notification', label:'Create feature access notification (draft)', live:false },
  { id:'request_rollout_approval', label:'Request rollout approval (preview)', live:false },
];
function registry(){ return { triggers:TRIGGERS, actions:ACTIONS, live:false }; }
module.exports={ TRIGGERS, ACTIONS, registry };
