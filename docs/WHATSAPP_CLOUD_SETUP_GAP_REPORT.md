# WhatsApp Cloud Setup — Gap Report

This report explains **why** the Official WhatsApp Cloud Setup + Template Manager coordination
layer is being added, and exactly what is **left untouched**.

## Competitor parity context

WATI, AiSensy, Interakt, Zoko, Gallabox, respond.io, and Gupshup all ship a polished
**WhatsApp Cloud API onboarding wizard** and a **template manager** (create → validate →
preview → submit → track approval). SuperSender Pro already has a working Cloud **send/webhook**
lane but no guided onboarding or template management surface. This build closes that gap.

## What already exists (left untouched)

- **Live Cloud lane** in `server.js`: `/api/whatsapp-cloud/status|settings|send-text|send-template|webhook`.
- **WATI** broadcast/copilot lane.
- **Baileys / whatsapp-web.js** bots.
- **Template Marketplace** (internal automation blueprints — a different concept from Meta message templates).

None of the above are modified, rebuilt, or duplicated.

## What is missing (added by this build)

| Layer | Gap | Resolution |
|---|---|---|
| Onboarding | No guided WABA / phone / token / webhook checklist | `lib/whatsappCloudSetup/` wizard + readiness scoring |
| Webhook | No verification *helper/guide* (only the live route) | `webhookVerifier.js` (read-only, dry-run preview) |
| Templates | No create/validate/preview/quality/sync surface | `lib/whatsappCloudTemplates/` manager |
| Send | No safe dry-run send preview | `sendPreview.js` (never calls Meta, never sends) |
| UI | No setup/template dashboard | `public/whatsapp-cloud-setup.html` |
| Ops | No docs/check/smoke for this layer | docs + `scripts/whatsapp-cloud-setup-check.js` + smoke test |

## Status legend applied during scan

`exists` · `partial` · `missing` · `duplicate_risk` · `safe_to_extend` · `route_mounted` ·
`dashboard_linked` · `needs_route` · `needs_ui` · `needs_docs` · `needs_test`

## Non-negotiable safety rules honoured

1. Never store or print real access tokens.
2. Never expose full phone numbers (mask only).
3. Dry-run by default; live send disabled; live template sync disabled.
4. No real Meta API call unless an explicit env flag is set by the operator.
5. New route prefix `/api/whatsapp-cloud-setup` does not collide with the live `/api/whatsapp-cloud` lane.
