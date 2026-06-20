# Team Access Smoke Test

Generated: 2026-06-20T12:47:16.864Z

**21/21 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require workspace registry | ✅ | ok |
| 2 | require team member registry | ✅ | ok |
| 3 | require role registry | ✅ | ok |
| 4 | require permission matrix | ✅ | ok |
| 5 | require access evaluator | ✅ | ok |
| 6 | require seat usage | ✅ | ok |
| 7 | require invite drafts | ✅ | ok |
| 8 | require risky action gate | ✅ | ok |
| 9 | require route module | ✅ | loaded |
| 10 | barrel loads | ✅ | ok |
| 11 | create sample workspace | ✅ | ws_2w4twjrbll |
| 12 | create sample member (masked) | ✅ | masked |
| 13 | evaluate dashboard.view allowed | ✅ | allowed |
| 14 | billing.manage blocked for support agent | ✅ | blocked |
| 15 | tenant mismatch blocked | ✅ | blocked |
| 16 | create invite draft | ✅ | pending_approval |
| 17 | dryRun true | ✅ | dryRun=true |
| 18 | live invite disabled | ✅ | disabled |
| 19 | auth write disabled | ✅ | disabled |
| 20 | risky action blocked (preview) | ✅ | preview |
| 21 | no phone/email/token leaks | ✅ | clean |
