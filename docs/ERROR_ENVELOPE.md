# API Error Envelope + JSON 404

Consistent error responses across the API and a JSON 404 for unknown `/api` routes (instead of the default HTML page).

## Envelope
```json
{ "success": false, "error": "human message", "code": "machine_code", "requestId": "abc123" }
```
`requestId` is included when request tracing (PR #133) set it, so a client error can be matched to a server log line.

## Helpers
```js
const { errors, sendError } = require('../lib/http/errors');
// throw typed errors from handlers / services:
throw errors.notFound('deal not found');
throw errors.forbidden('requires owner');
// or send directly:
try { ... } catch (e) { sendError(res, e, req); }
```
Factories: `badRequest(400) unauthorized(401) forbidden(403) notFound(404) conflict(409) tooMany(429) internal(500)` -> each makes an `ApiError` with `status` + machine `code`.

## 404 handler
Mount **after** all `/api` routers and **before** the error handler:
```js
app.use(require('./lib/http/errors').notFoundHandler('/api'));
```
Unknown `/api/*` -> `404 { code:'not_found' }`. Non-API paths (static, UI) fall through to normal handling.

## Note
The global error handler from observability (#133) already catches thrown errors; pairing it with these typed factories gives every error a predictable shape + machine code the frontend can switch on.

## Verify
```bash
node tests/smoke/errorsSmoke.js
```
