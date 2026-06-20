# WhatsApp Template Manager

Create, validate, preview, and assess WhatsApp Cloud **message templates** locally — with a
dry-run sync preview. No live Meta API call is made unless `WHATSAPP_CLOUD_TEMPLATE_SYNC_LIVE=true`
(off by default), and even then this layer only previews; it never sends.

> This is distinct from the existing **Template Marketplace** (internal automation blueprints).

## Template model

```
{ id, name, language, category, status, headerType, body, footer, buttons,
  variables, sampleValues, qualityRating, rejectionReason, dryRun, createdAt, updatedAt }
```

## Categories

- **marketing** — promotional; requires opt-in; strictest review; highest block risk.
- **utility** — transactional (order updates, alerts); fastest approval when non-promotional.
- **authentication** — OTP / 2FA only; no URLs or promotional content allowed.

## Approval statuses

`draft → pending → approved` (also `rejected`, `paused`, `disabled`, `unknown`). Local drafts start
as `draft`; live approval status comes from Meta and is shown as a placeholder until live sync is
explicitly enabled by an operator.

## Variables

Body placeholders use `{{name}}` or `{{1}}` syntax. The manager extracts variables automatically,
flags missing sample values, and renders a preview with sample/provided values.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/whatsapp-cloud-setup/templates` | List templates |
| POST | `/api/whatsapp-cloud-setup/templates` | Create / upsert a draft |
| GET | `/api/whatsapp-cloud-setup/templates/:id` | Get one |
| PUT | `/api/whatsapp-cloud-setup/templates/:id` | Update |
| POST | `/api/whatsapp-cloud-setup/templates/:id/preview` | Render preview |
| POST | `/api/whatsapp-cloud-setup/templates/:id/validate` | Validate + quality/risk |
| POST | `/api/whatsapp-cloud-setup/templates/sync-preview` | Dry-run sync plan |
| GET | `/api/whatsapp-cloud-setup/templates/report` | Status/category roll-up |

## Quality / risk

Each template gets a `GREEN / YELLOW / RED` quality rating plus category risk notes (penalties for
URLs in auth templates, spam phrasing, excessive length, too many variables, missing footer).
