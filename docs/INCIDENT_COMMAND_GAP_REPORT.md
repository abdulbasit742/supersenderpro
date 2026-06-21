# Incident Command — Gap Report (scan-first)

This is a coordination layer on top of existing modules. Nothing is rebuilt.


## Legend
exists | partially_exists | missing | duplicate_risk | safe_to_extend | needs_route | needs_ui | needs_docs | needs_test
| needs_wiring | destructive_risk | privacy_risk

## Detected (reuse via adapters)
| System | Status | Integration point |
|---|---|---|
| Launch Test Center | exists | launchHealthAdapter reads its report/status |
| Security Scan | exists | securityHealthAdapter reads its report/status |
| Group Commerce OS + inbox | exists | groupCommerceHealthAdapter reads store status |
| Payment Validation Guard | exists | paymentHealthAdapter reads safe status |
| Local Worker Bridge | exists | whatsapp/channel adapters read heartbeat status |
| Integration Setup (Sheets/n8n) | exists | reporting surfaced via adapters |
| SuperFlow Studio | exists | flowStudioHealthAdapter |
| WhatsApp Cloud Setup | exists | whatsappHealthAdapter reads config inspector |


## Incident Command layer (to build)
All `lib/incidentCommand/*`, `routes/incidentCommandRoutes.js`, `public/incident-command.*`, docs, check, smoke = missing
-> create. Classified safe_to_extend, needs_route, needs_ui, needs_docs, needs_test.


## Risk flags
- destructive_risk: NONE. No auto-fix executes; all fixes are dry-run suggestions.
- privacy_risk: controlled. Adapters mask phones/emails/tokens; `detailsSafe` only.


## Verdict
safe_to_extend. Build coordination layer as new isolated files + tiny append-only hooks.

lib/incidentCommand/safetyGuard.js + store.js
