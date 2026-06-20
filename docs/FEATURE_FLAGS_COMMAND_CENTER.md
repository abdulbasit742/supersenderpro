# Feature Flags + Rollout Control + Emergency Kill Switch Command Center

One safe control layer for enabling/disabling modules, tenant/reseller/plan-based access, beta/percentage
rollout previews, and emergency kill switches — **without rebuilding** any config/auth/RBAC/billing module.

> Additive only. Does NOT rebuild SaaS Billing, Tenant Portal, Security Gateway, Approval Inbox, Audit Ledger,
> Compliance Center, Developer Portal, Deployment/Incident Command, Public Funnel, Pilot Ops, Reseller Portal,
> Template Marketplace, Support Helpdesk, or Owner Command. It coordinates them via detect-or-skip adapters.

## Safety defaults
| Flag | Default |
|---|---|
| `FEATURE_FLAGS_ENABLED` | true |
| `FEATURE_FLAGS_DRY_RUN` | true |
| `FEATURE_FLAGS_ALLOW_LIVE_WRITE` | false |
| `FEATURE_FLAGS_ALLOW_KILL_SWITCH_WRITE` | false |
| `FEATURE_FLAGS_REQUIRE_APPROVAL` | true |
| `FEATURE_FLAGS_REQUIRE_AUDIT` | true |

All rollout & kill-switch actions are **preview-only, approval-required, audited, dry-run, no-live-write,
non-destructive** by default.

## Files
```
lib/featureFlags/        # store, guards, config, registry, defaults(30), evaluator chain,
                         # rollout planner/preview/history, kill switch + planner, flow nodes,
                         # admin commands, 16 adapters, barrel
routes/featureFlagsRoutes.js
public/feature-flags.*   # admin dashboard
scripts/feature-flags-check.js
tests/smoke/featureFlagsSmoke.js
```

## Feature flag model
`id, key, name, description, moduleId, category, status, enabled, defaultValue, rolloutMode, rolloutPercent,
allowedPlans, allowedTenants, allowedResellers, allowedRoles, betaGroup, requiresApproval, riskLevel,
killSwitchEnabled, dryRun, createdAt, updatedAt`

## How to test
```bash
npm run feature-flags:check
npm run feature-flags:smoke
```

## What NOT to commit
`.env`, `.env.*`, `data/feature-flags*.json` runtime state, raw feature usage/security logs, logs, uploads,
auth/session folders, token/credential files, raw customer/lead data, node_modules. (Covered by `.gitignore`.)
