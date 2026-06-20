# Feature Access Evaluation

`flagEvaluator.evaluate(featureKey, context)` returns:
`{ featureKey, allowed, reason, status, dryRun, requiresApproval, blockers, warnings }`

## Evaluation order
1. **Kill switch** active → always block.
2. **Env override** off → block.
3. **Security/compliance** blockers (high/critical security risk, compliance blocked).
4. **High/critical risk** → warning that approval is required before live.
5. **Plan insufficiency** → returns `billingUpgradePreview` (not a hard error).
6. **Rollout mode** predicate (all/beta/allowlist/plan/percentage/admin).

Private tenant/reseller data is never exposed; ids are masked in responses.
