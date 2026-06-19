# Audience, Templates &amp; Spintax

Second feature pack on top of the Campaign Scheduler. Adds a **contact book with
tags &amp; segmentation**, **reusable message templates**, and a **spintax + variable
engine** for personalized, anti-ban message variation. All file-based, **no new
runtime dependencies**.

## Files added

| File | Purpose |
|------|---------|
| `lib/spintax.js` | `{a\|b\|c}` spintax expansion + `{{var}}` templating + variant counting |
| `lib/templateStore.js` | CRUD store for reusable templates (auto-detects variables) |
| `lib/contactStore.js` | Contacts with tags, attributes, CSV import/export, segment queries |
| `routes/templates.js` | Template REST API + `mountTemplates(app)` |
| `routes/contacts.js` | Contacts REST API + `mountContacts(app)` |
| `public/audience.html` | Dashboard for contacts + templates with live preview |
| `scripts/test-audience.js` | Offline smoke test (22 assertions) |

## Integration with campaigns

The campaign scheduler and create endpoint were enhanced (backward-compatible):

- **Spintax + variables in messages** — `scheduler.render()` now expands
  `{a|b}` spintax and `{{var}}` (from `recipient.attributes`) in addition to the
  legacy `{name}` / `{to}` placeholders.
- **Create from a template** — `POST /api/campaigns` accepts `templateId` instead
  of `message`.
- **Target a segment** — `POST /api/campaigns` accepts `segment: { tags, match }`
  instead of a raw `recipients` array; recipients are pulled from the contact book.

```json
POST /api/campaigns
{
  "name": "VIP June blast",
  "templateId": "tpl_ab12cd34",
  "segment": { "tags": ["vip", "lahore"], "match": "all" },
  "throttleMs": 2500,
  "dailyCap": 200
}
```

## Spintax / variables

```text
Hi {{name}}, {great|amazing|wonderful} news — {20%|flat 500rs} off today!
```

- `{{name}}` → replaced from contact name / attributes.
- `{a|b|c}` → one option chosen at random per recipient (nesting supported).
- Each recipient gets a slightly different message → lower spam/ban risk.

## REST API

### Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create (`name`, `body`) |
| GET/PUT/DELETE | `/api/templates/:id` | Get / update / delete |
| POST | `/api/templates/:id/preview` | Render with `{ variables }` |
| POST | `/api/templates-preview` | Stateless preview of any `body` |

### Contacts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | List contacts |
| POST | `/api/contacts` | Add / upsert (`number`, `name`, `tags`, `attributes`) |
| GET | `/api/contacts/tags` | All tags with counts |
| GET | `/api/contacts/segment?tags=a,b&match=any` | Segment + ready recipients |
| GET | `/api/contacts/export` | Download CSV |
| POST | `/api/contacts/import` | Import `{ csv }` or `{ contacts: [] }` |
| POST/DELETE | `/api/contacts/:id/tags[/:tag]` | Add / remove a tag |
| DELETE | `/api/contacts/:id` | Delete contact |

## Wiring into `server.js`

```js
const { mountCampaigns } = require('./routes/campaigns');
const { mountTemplates } = require('./routes/templates');
const { mountContacts }  = require('./routes/contacts');

mountContacts(app);
mountTemplates(app);
mountCampaigns(app, { sendMessage: async (to, msg) => { /* live WA send */ } });
```

Dashboards (served from existing static `public/`):
`/campaigns.html` and `/audience.html`.

## Testing

```bash
node scripts/test-campaigns.js   # 15 assertions
node scripts/test-audience.js    # 22 assertions
```
