# SaaS Billing Smoke Test

Generated: 2026-06-20T08:58:22.828Z

**23/23 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require plan registry | ✅ | 9 plans |
| 2 | require license engine | ✅ | ok |
| 3 | require usage meter | ✅ | ok |
| 4 | require quota checker | ✅ | ok |
| 5 | require invoice builder | ✅ | ok |
| 6 | require feature gate | ✅ | ok |
| 7 | require barrel | ✅ | ok |
| 8 | route module requires | ✅ | loaded |
| 9 | create sample tenant + assign starter plan | ✅ | starter |
| 10 | issue license (trial, masked key) | ✅ | trial |
| 11 | record sample usage | ✅ | 5 channel_posts |
| 12 | usage record is dry-run aware | ✅ | dryRun=true |
| 13 | check quota (warn-only) | ✅ | ok |
| 14 | build invoice draft | ✅ | INV-2026-00002 |
| 15 | mark-paid stays manual review (no auto-capture) | ✅ | manual review |
| 16 | feature gate warn-only behavior | ✅ | suggest pro |
| 17 | preview enforcement does not change posture | ✅ | preview ok |
| 18 | protected actions never blocked | ✅ | login safe |
| 19 | plan change preview requires approval | ✅ | upgrade |
| 20 | reseller register + commission (no payout) | ✅ | unpaid |
| 21 | doctor produces score | ✅ | 100/100 healthy |
| 22 | no license/payment refs leak in output | ✅ | clean |
| 23 | reports build | ✅ | ok |
