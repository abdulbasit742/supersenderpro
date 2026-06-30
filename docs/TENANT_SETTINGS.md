# Per-Tenant Settings

A documented key-value store for each tenant's preferences: white-label branding, business hours, locale, default currency, reply tone, follow-up toggle. Tenant-scoped; unknown keys are rejected so it stays a real surface, not a junk drawer.

## Known settings
| Key | Type | Default |
|---|---|---|
| `brandName` | string | SuperSender |
| `brandLogoUrl` | string | '' |
| `brandColor` | string | #22c55e |
| `locale` | string | en |
| `timezone` | string | Asia/Karachi |
| `currency` | string | PKR |
| `businessHours` | json | per-day open hours |
| `autoReplyTone` | string | friendly |
| `followUpEnabled` | bool | true |

Extend the `SCHEMA` in `lib/settings/index.js` as features need.

## API (`/api/settings`)
- `GET /api/settings` (auth) -> `{ settings, schema }` (merged with defaults).
- `PUT /api/settings` (admin) `{ brandName, currency, ... }` -> validated + coerced, returns the full merged set.
- `POST /api/settings/reset` (admin) `{ key? }` -> reset one key (or all) to default.

## Use from code
```js
const settings = require('../lib/settings');
const { brandName, currency, followUpEnabled } = await settings.getAll(tenantId);
```
E.g. the sales pipeline can read `followUpEnabled`/`autoReplyTone`; invoices can read `currency`; the dashboard can read branding.

## Verify
```bash
node tests/smoke/settingsSmoke.js
```
