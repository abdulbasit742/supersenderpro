   # Support Helpdesk + Knowledge Base — Gap Report

   ## Scan summary
   Scanned for support/helpdesk modules, ticket modules, FAQ/KB docs, Customer 360,
   Pilot Ops, Owner Command, Voice AI, AI Agent Deployment, Incident Command,
   Compliance Center, Public Funnel, Business Setup, Playbook Builder, CRM, WhatsApp

admin commands, docs, routes, lib, public, scripts, tests.

## Headline
No dedicated support/helpdesk or knowledge base module exists. The closest overlap
is **Pilot Ops feedback** (`lib/pilotOps/feedbackStore` + `bugTriage`), which tracks
pilot feedback/bugs. The helpdesk does NOT rebuild it: the pilotOps adapter pulls
those items in as ticket-shaped previews (read-only) and Pilot Ops keeps ownership.

## Classification
| Area | Status | Action |
| --- | --- | --- |
| Pilot Ops feedback | exists, duplicate_risk | safe_to_extend (read-only pull) |
| Customer 360 | partially_exists, privacy_risk | masked contact preview |
| Owner Command / Incident / Compliance / Business Setup / KPI | exists | safe_to_extend (adapters) |
| Voice AI / Public Funnel | missing | adapters return unavailable |
| AI provider | partially_exists | optional; rule-based fallback default |
| **Support Helpdesk + KB** | **missing -> created** | new coordination layer |

## Privacy / live-action risk
- PII masked (phone last-4, email, name); raw messages never stored, only safe previews.
- Replies are drafts only; no live WhatsApp/email; external AI off by default.
- Public contact form requires consent and creates a local ticket preview only.


## Follow-ups
- needs_wiring: confirm Voice AI + Public Funnel entry points when they exist.
- recommend: when wiring live replies, route through the existing WhatsApp sender + Compliance gate.
