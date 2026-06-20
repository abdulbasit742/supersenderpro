# Rollout Control Guide

Rollout modes: `off, all, beta_only, tenant_allowlist, reseller_allowlist, plan_based, percentage_preview,
admin_only, killed`.

## Rollout plan
`id, featureKey, fromStatus, toStatus, targetMode, targetPercent, targetPlans, targetTenants, targetResellers,
estimatedImpact, requiredApprovals, blockers, warnings, dryRun, createdAt`

## Supported previews
enable-for-all · disable-for-all · beta-only · tenant allowlist · reseller allowlist · plan-based ·
percentage rollout · rollback · emergency kill switch.

## No live apply by default
Flag changes are **local config previews** only. Live propagation requires `FEATURE_FLAGS_ALLOW_LIVE_WRITE=true`.
High/critical-risk rollouts create an **approval-item preview** (never auto-approved).

```
POST /api/feature-flags/rollout/plan     {featureKey, targetMode, targetPercent, ...}
POST /api/feature-flags/rollout/preview  {featureKey, targetMode, ...}
GET  /api/feature-flags/rollout/history
```
