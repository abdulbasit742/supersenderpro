# Security Gateway Smoke Test

Generated: 2026-06-20T12:22:58.998Z

**24/24 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require barrel | ✅ | ok |
| 2 | require security policy | ✅ | ok |
| 3 | require rate limiter | ✅ | ok |
| 4 | require abuse detector | ✅ | ok |
| 5 | require input validator | ✅ | ok |
| 6 | require scope guard | ✅ | ok |
| 7 | require tenant isolation guard | ✅ | ok |
| 8 | require security event writer | ✅ | ok |
| 9 | require security doctor | ✅ | ok |
| 10 | require route module | ✅ | loaded |
| 11 | default posture is dry-run | ✅ | dryRun=true |
| 12 | enforcement disabled by default | ✅ | enforce=false |
| 13 | IP hashing never returns raw IP | ✅ | iph_e2c6852421292ca1 |
| 14 | user-agent hashing works | ✅ | hashed |
| 15 | PII/token redaction works | ✅ | clean |
| 16 | rate limit warning works | ✅ | retryAfter=60 |
| 17 | abuse score works | ✅ | 100/critical |
| 18 | secret-in-payload detected | ✅ | flagged |
| 19 | public form guard requires consent | ✅ | consent enforced |
| 20 | scope guard preview does not block by default | ✅ | preview |
| 21 | tenant isolation guard warns on mismatch | ✅ | warn |
| 22 | security event is redacted | ✅ | sev_mqmbw2oz_a3b347 |
| 23 | doctor produces score + status | ✅ | 100/100 production_launch_ready_with_caution |
| 24 | no raw IP/full phone/email/token leaks | ✅ | clean |
