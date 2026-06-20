# Feature Flags Flow Nodes

If Flow Studio exists, register these metadata entries (`lib/featureFlags/flowNodes.js`). No live external
execution — execution is owned by Flow Studio.

## Triggers
`feature_flags.flag_changed_preview, feature_flags.rollout_planned, feature_flags.kill_switch_previewed,
feature_flags.access_blocked, feature_flags.high_risk_rollout_requested`

## Actions
`evaluate_feature_flag, create_rollout_preview, create_kill_switch_preview,
create_feature_access_notification, request_rollout_approval`

`GET /api/feature-flags/flow-nodes` returns the registry.
