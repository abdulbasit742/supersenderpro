# Security - Request Validation

Dependency-free input validation so routes reject malformed bodies with a clear `400` instead of failing deep in a handler. Opt-in per route (no rewrites required).

## Use
```js
const { validateBody, schemas } = require('../lib/security/validate');
router.post('/signup', validateBody(schemas.signup), handler);
router.post('/login',  validateBody(schemas.login),  handler);
```
On failure: `400 { success:false, error:'validation failed', fields:[{field, error}] }`. On success, `req.body` is normalized (numbers/booleans coerced, defaults applied).

## Schema shape
```js
{ email: { required:true, type:'string', email:true },
  password: { required:true, type:'string', min:8 },
  planId: { required:true, enum:['free','starter','pro'] },
  value: { type:'number', min:0 } }
```
Supported rules: `required, type (string|number|boolean|array|object), min, max, enum, email, pattern, default`.

## Ready-made schemas
`schemas.signup`, `schemas.login`, `schemas.checkout`, `schemas.deal` - matching the auth/billing/sales routes shipped. Extend as needed.

## Note
This is intentionally tiny and dependency-free to match the repo convention. If you later add `zod`, you can replace `validate()` while keeping the same `validateBody()` middleware signature.

## Verify
```bash
node tests/smoke/validateSmoke.js
```
