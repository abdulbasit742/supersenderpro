# Local Demo Mocking Guide


## Goal
Run a believable SuperSender Pro demo on a laptop / in VS Code with zero credentials and zero external calls.


## Steps
1. Copy the mock gateway files into the repo (relative paths only).
2. Paste the marked BEGIN/END MOCK GATEWAY HOOK blocks into server.js + public/index.html.
3. Add the `.env.example` placeholders + `.gitignore` protections.
4. `npm run mock-gateway:check` then `npm run mock-gateway:smoke`.
5. `node server.js` and open `/mock-gateway`.


## Input sanitizer
Paste any sample payload into the dashboard sanitizer to see findings + a redacted preview. Use it to confirm no real
PII/secrets reach logs.


## What Gumloop should push later
Only the mock gateway files + the marked hooks. Never `.env`, `data/`, `sessions/`, or `artifacts/`.
