# Mock Gateway — Gap Report (scan-first, ClickUp workspace only)


## Legend
exists | partial | missing | broken | duplicate_risk | safe_to_extend | route_mounted | dashboard_linked | docs_present |
script_present | smoke_test_present | external_call_risk | secret_risk | PII_risk | live_action_risk |
safe_fix_recommended

## Headline
No unified offline mock/simulator layer exists. Existing modules (WhatsApp Cloud Setup, payment validation, security
scan, etc.) have their own dry-run behavior but there is no single offline provider simulator for demos. This layer adds
it, isolated, and reuses existing modules read-only.


## Build classification
All `lib/mockGateway/*`, `routes/mockGatewayRoutes.js`, `public/mock-gateway.*`, docs, check, smoke = missing -> create.
safe_to_extend, route_mounted:false (hook provided), dashboard_linked:false (hook provided).


## Risk review
- external_call_risk: none by default (externalCallsEnabled=false; no fetch/http to providers).
- secret_risk / PII_risk: redacted by mockRedactor + sanitizer.
- live_action_risk: none (liveActionsEnabled=false; simulators never send).

## Verdict
safe_to_extend. Build offline mock gateway as new isolated files + tiny append-only hooks. No commit/push.


lib/mockGateway/mockSafety.js + mockConfig.js +
mockRedactor.js + mockPIIPatterns.js +
mockSecretPatterns.js + mockInputSanitizer.js
