# End-to-End Integration Test

`tests/smoke/e2eFlowSmoke.js` is the highest-value test in the suite: it exercises the **seams between** the subsystems we shipped today, in one realistic customer flow, and then proves tenant isolation holds across all of them.

## The flow (Tenant A)
signup (becomes owner) -> JWT resolves to tenant -> starts on Free -> usage metering hits the Free cap -> quota blocks -> upgrade to Pro -> cap lifts -> create deal -> move NEW_LEAD->QUALIFIED->NEGOTIATION->WON -> generate quote -> convert to invoice -> metrics show win.

## The guarantee (Tenant B)
After all of A's activity, a second tenant B must see **nothing**: no users, can't log in with A's credentials, clean Free subscription, zero deals, zero quotes/invoices, zero metrics. This is the multi-tenancy promise from the roadmap, enforced as a test.

## Run
```bash
node tests/smoke/e2eFlowSmoke.js   # json driver, no DB/Stripe/server needed
```
Runs automatically inside `node scripts/ci-smoke.js` and the GitHub Actions CI.

## Why it matters
Unit smokes prove each module works alone. This proves they work **together** and that the hard tenant boundary survives a full lifecycle - the single most important property of a multi-tenant SaaS.
