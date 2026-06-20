# Feature Flags Smoke Test

Generated: 2026-06-20T12:22:51.799Z

**15/15 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require feature registry | ✅ | ok |
| 2 | require evaluator | ✅ | ok |
| 3 | require rollout planner | ✅ | ok |
| 4 | require kill switch module | ✅ | ok |
| 5 | require route module | ✅ | loaded |
| 6 | barrel loads | ✅ | ok |
| 7 | load default flags (>=30) | ✅ | 30 flags |
| 8 | evaluate WhatsApp for sample tenant | ✅ | allowed=true |
| 9 | evaluate Developer Portal for sample plan | ✅ | plan_insufficient |
| 10 | generate rollout preview | ✅ | ~25% of tenants (preview bucket) |
| 11 | generate kill switch preview | ✅ | preview |
| 12 | dryRun true | ✅ | dryRun=true |
| 13 | live write disabled | ✅ | blocked |
| 14 | approval required (high-risk rollout) | ✅ | approval |
| 15 | no phone/email/token leaks | ✅ | clean |
