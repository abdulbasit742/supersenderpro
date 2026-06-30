# Phase 1 - Schema Coverage (collection -> Prisma model)

The tenant-scoped repository (`lib/db`) addresses data by `collection` name. On the json driver any collection just works; on the **postgres** driver each collection must map to a Prisma model. This doc tracks that the schema now covers every subsystem shipped.

| `lib/db` collection | Prisma model | Used by |
|---|---|---|
| `customers` | `Customer` | store CRM |
| `orders` | `Order` | orders/fulfilment |
| `quotes` | `Quote` | sales pipeline quotes/invoices |
| `inbox_messages` | `InboxMessage` | WhatsApp inbox |
| `txns` | `Txn` | payments ledger |
| `webhook_endpoints` | `WebhookEndpoint` | outbound webhooks |
| `follow_ups` | `FollowUp` | sales follow-ups |
| `users` | **`User`** (added) | auth (PR #90) |
| `subscriptions` | **`Subscription`** (added) | billing (PR #95) |
| `usage` | **`UsageRecord`** (added) | usage metering (PR #95) |
| `deals` | **`Deal`** (added) | sales pipeline (PR #42) |
| `carts` | **`Cart`** (added) | cart recovery (PR #42) |

## Why this matters
Without the added models, switching `DB_DRIVER=postgres` would throw `Unknown collection/model` for auth/billing/sales the moment they ran. Now the postgres path covers everything the json path does.

## Note on the repo's MODEL map
`lib/db/index.js` maps collection -> Prisma delegate. The added models use the same snake_case `@@map` table names and default camelCase delegates (`user`, `subscription`, `usageRecord`, `deal`, `cart`); if a collection name differs from the delegate, extend the `MODEL` map in `lib/db/index.js` accordingly. `usage` -> `usageRecord` and `usage_records` is the one to double-check when wiring billing to postgres.

## Apply
```bash
npx prisma migrate dev -n add-users-subs-usage-deals-carts
npx prisma generate
DB_DRIVER=postgres node scripts/db-doctor.js
```
