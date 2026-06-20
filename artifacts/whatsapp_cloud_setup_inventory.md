# WhatsApp Cloud Setup — Inventory Scan

**Feature:** Official WhatsApp Cloud Setup + Template Manager
**Generated:** 2026-06-20

## Existing WhatsApp systems found (NOT rebuilt)

| System | Location | Status | Decision |
|---|---|---|---|
| WhatsApp Cloud API lane (send + webhook) | `server.js` `/api/whatsapp-cloud/*` | exists | do_not_rebuild |
| WATI broadcast lane | `routes/wati.js`, `lib/watiBroadcast.js`, `lib/watiCopilot.js` | exists | do_not_rebuild |
| WhatsApp Cloud connector inspector | `lib/unifiedSetup/connectors/whatsappCloudConnector.js` | exists | do_not_rebuild |
| Baileys / whatsapp-web.js bots | `wa-sales-bot/`, `whatsapp-ai-tools-bot/`, `bots/` | exists | do_not_rebuild |
| Template Marketplace (automation blueprints) | `routes/templateMarketplaceRoutes.js`, `lib/templateMarketplace/` | exists | do_not_rebuild |

> The existing `/api/whatsapp-cloud/*` lane handles **live send + webhook**. This feature uses a
> **separate** `/api/whatsapp-cloud-setup/*` prefix and only adds the missing **coordination layer**
> (onboarding wizard + template manager). No existing route, page, or send path is modified.

## Duplicate-risk check

| Target | State |
|---|---|
| `lib/whatsappCloudSetup/` | missing → safe to create |
| `lib/whatsappCloudTemplates/` | missing → safe to create |
| `routes/whatsappCloudSetupRoutes.js` | missing → safe to create |
| `public/whatsapp-cloud-setup.html` | missing → safe to create |
| `/api/whatsapp-cloud-setup` prefix | free (distinct from `/api/whatsapp-cloud`) |

## Gap targets (this build)

| Item | Status | Tags |
|---|---|---|
| WhatsApp Cloud setup wizard | missing | needs_route, needs_ui, needs_docs, needs_test, safe_to_extend |
| WABA / phone number setup checklist | missing | needs_route, needs_ui, needs_docs |
| Webhook verification helper | partial | needs_route, needs_docs |
| Template manager | missing | needs_route, needs_ui, needs_docs, needs_test |
| Template status dashboard | missing | needs_ui |
| Template sync preview | missing | needs_route |
| Template send preview | missing | needs_route, needs_test |
| Quality / risk checklist | missing | needs_route |
| Docs / check / smoke tests | missing | needs_docs, needs_test |

## Safety posture

- Dry-run by default
- Live send disabled
- Template sync (live Meta API) disabled
- Real access tokens never stored or printed
- Phone numbers always masked
- PII redacted in all responses
