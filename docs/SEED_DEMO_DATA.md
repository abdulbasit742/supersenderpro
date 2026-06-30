# Demo Data Seeder

Spin up a realistic tenant in one command - for demos, onboarding screenshots, and manual QA. Uses the **real** subsystem APIs (auth/billing/salesPipeline) so seeded data behaves identically to production data and stays tenant-isolated.

## Seed
```bash
node scripts/seed-demo.js               # seeds tenant 'demo'
node scripts/seed-demo.js acme-co       # seeds a named tenant
```
Creates: an owner user (`owner@demo.test` / `demopassword1`), Pro plan, 4 customers, 5 deals spread across stages (incl. one WON), and a quote + invoice on the won deal.

## Clear
```bash
node scripts/seed-demo.js demo --clear
```
Removes seeded rows (customers, deals, quotes, follow_ups, users, subscriptions) for that tenant only.

## Safety
- Only ever touches the given `tenantId` (isolation enforced by `lib/db`).
- Owner creation is tolerant if the user already exists.
- Default driver is `json`; set `DB_DRIVER=postgres` to seed a database.

## Verify
```bash
node tests/smoke/seedSmoke.js
```

## Tip
Great for the ops dashboard (`/api/ops/ui`) and API docs (`/api/docs`) demos - seed first so there's something to look at.
