# Tenant Isolation Smoke Test

Generated: 2026-06-20T12:45:48.363Z

**24/24 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require barrel | ✅ | ok |
| 2 | require boundary policy | ✅ | ok |
| 3 | require evaluator | ✅ | ok |
| 4 | require leak detector | ✅ | ok |
| 5 | require route scanner | ✅ | ok |
| 6 | require store scanner | ✅ | ok |
| 7 | require cross-tenant simulation | ✅ | ok |
| 8 | require isolation doctor | ✅ | ok |
| 9 | require route module | ✅ | loaded |
| 10 | default posture is dry-run | ✅ | dryRun=true |
| 11 | raw export disabled by default | ✅ | no raw export |
| 12 | Tenant A reading Tenant B is blocked | ✅ | critical |
| 13 | assigned reseller client preview allowed | ✅ | allowed |
| 14 | unassigned reseller client blocked | ✅ | blocked |
| 15 | public requesting private data blocked | ✅ | blocked |
| 16 | developer insufficient scope blocked | ✅ | blocked |
| 17 | payload scan redacts phone/email/token | ✅ | 3 findings |
| 18 | secret in payload detected | ✅ | flagged |
| 19 | route scanner runs | ✅ | 19 routes |
| 20 | store scanner runs (source-only) | ✅ | 436 files |
| 21 | simulations all pass | ✅ | 10/10 |
| 22 | doctor produces score + status | ✅ | 100/100 production_launch_ready_with_caution |
| 23 | no raw export from report | ✅ | blocked |
| 24 | no full phone/email/token leaks in snapshot | ✅ | clean |
