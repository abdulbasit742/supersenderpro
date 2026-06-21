 # Mock Gateway

 An offline provider simulator so this workspace runs local/demo interactions with no real WhatsApp, payment, AI, webhook,
 email, social, ecommerce, billing, or tenant credentials. It rebuilds nothing; it simulates provider responses and
 provides demo QA. Everything is offline-only, dry-run, redacted.


 ## What it simulates
 WhatsApp (Baileys + Cloud), channel publisher, social publisher, ecommerce, payment verifier, webhook delivery, AI
 provider, Voice AI, email, billing, tenant, support, developer portal, audit/security.

 ## API
 `/status`, `/providers`, `/providers/:provider/status`, `/scenarios`, `/scenarios/:id`, `/run`, `/run/:provider`,
 `/sanitize`, `/events`, `/report/generate`, `/doctor`.


 ## How to run locally

npm run mock-gateway:check
npm run mock-gateway:smoke
node server.js # then open /mock-gateway
 ## Why no real API calls happen
 The simulator code never branches into real I/O. `externalCallsEnabled` and `liveActionsEnabled` are reported but the
 code paths only build preview objects. Responses are always `dryRun:true, offlineOnly:true`.

 ## What not to commit
 `data/mock-gateway-events*.json`, `artifacts/mock_gateway_*`.
