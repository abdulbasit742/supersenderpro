 data/mock-gateway-events.json
 data/mock-gateway-events.smoke.json
 # END MOCK GATEWAY HOOK




5) package.json — scripts (add only, remove nothing)
 "mock-gateway:check": "node scripts/mock-gateway-check.js",
 "mock-gateway:smoke": "node tests/smoke/mockGatewaySmoke.js"




Validation (run locally, do not fake)
 node --check server.js
 node --check routes/mockGatewayRoutes.js
 node --check lib/mockGateway/index.js
 node --check lib/mockGateway/mockRegistry.js
 node --check lib/mockGateway/mockScenarioRunner.js
 node --check lib/mockGateway/mockInputSanitizer.js
 node --check lib/mockGateway/mockGatewayDoctor.js
 node --check scripts/mock-gateway-check.js
 node --check tests/smoke/mockGatewaySmoke.js

  npm run mock-gateway:check
  npm run mock-gateway:smoke



Note: depends only on express (already in your stack) + Node built-ins ( fs , path ). No new dependencies. The
simulator never performs real I/O regardless of env flags. After running, git status --short only, do NOT
commit/push.
