# Contacts CRM + Dynamic Segmentation

The targeting layer that makes broadcasts convert (and that Wati/AiSensy/Interakt gate behind
paid tiers): tenant-scoped contacts with custom attributes + tags + opt-in/out, CSV/bulk import,
and **rule-based dynamic segments** that resolve live to a recipient list.

> **No sending here.** Segments produce recipient lists the broadcast engine consumes.
> Opted-out contacts are excluded from resolve/preview by default (broadcast-safe).

## Wire it up

```bash
node scripts/wire-contacts.js     # mounts /api/contacts (idempotent)
node scripts/contacts-check.js    # smoke test (exit 0 = pass)
```

`scripts/wire-all.js` also runs the wire step.

## Segments

```jsonc
{
  "name": "Lahore buyers, active 30d",
  "match": "all",                 // 'all' (AND) or 'any' (OR)
  "rules": [
    { "field": "has_tag",        "op": "has_tag",            "value": "buyer" },
    { "field": "attr:city",      "op": "eq",                 "value": "Lahore" },
    { "field": "lastActiveAt",   "op": "active_within_days", "value": 30 }
  ]
}
```

**Fields:** `tag` · `name` · `phone` · `lastActiveAt` · `attr:<key>`
**Operators:** `eq` `neq` `contains` `gt` `lt` `gte` `lte` `exists` `not_exists` `in` `has_tag` `no_tag` `active_within_days` `inactive_for_days`

## API (`/api/contacts`)

- `GET /status` · `GET /doctor`
- Contacts: `GET /contacts` · `POST /contacts` · `GET /contacts/:id` · `POST /contacts/:id/tags` · `POST /contacts/:id/opt-out` · `DELETE /contacts/:id` · `POST /import`
- Segments: `GET /segments` · `POST /segments` · `GET/PUT/DELETE /segments/:id` · `POST /segments/validate`
- Audience: `GET /segments/:id/preview` · `GET /segments/:id/resolve` · `POST /segments/preview`

Writes require `x-admin-secret` matching `CONTACTS_ADMIN_SECRET` (or `ADMIN_TOKEN`) when set.
